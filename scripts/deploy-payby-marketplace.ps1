param(
  [ValidateSet("testnet", "shelbynet")]
  [string]$Network = "testnet",
  [string]$Profile = "",
  [string]$PrivateKeyFile = "",
  [string]$Address = "",
  [string]$PaymentAssetMetadata = "",
  [int]$PublishMaxGas = 200000,
  [int]$InitMaxGas = 100000,
  [int]$GasUnitPrice = 100,
  [switch]$UpdateEnv
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$packageDir = Join-Path $repoRoot "contracts\payby_marketplace"
$envPath = Join-Path $repoRoot ".env"
$nodeUrl = if ($Network -eq "shelbynet") {
  "https://api.shelbynet.shelby.xyz/v1"
} else {
  ""
}

if ($Profile -match "^(karya|yora)(-|$)") {
  throw "Refusing to deploy with a non-Payby project profile: $Profile"
}

if ($Profile -and $PrivateKeyFile) {
  throw "Use either -Profile or -PrivateKeyFile, not both."
}

if (-not $Profile -and -not $PrivateKeyFile) {
  throw "Provide a dedicated Payby -Profile or a local -PrivateKeyFile. Never paste a private key into this script."
}

$signerArgs = @()
if ($PrivateKeyFile) {
  if (-not (Test-Path -LiteralPath $PrivateKeyFile -PathType Leaf)) {
    throw "Private key file was not found: $PrivateKeyFile"
  }
  $resolvedPrivateKeyFile = (Resolve-Path -LiteralPath $PrivateKeyFile).Path
  $signerArgs = @("--private-key-file", $resolvedPrivateKeyFile)
} else {
  $profileOutput = aptos config show-profiles
  if ($LASTEXITCODE -ne 0) {
    throw "Could not read the active Aptos CLI profiles."
  }
  $profileList = $profileOutput | ConvertFrom-Json
  $profileNames = @($profileList.Result.PSObject.Properties | ForEach-Object { $_.Name })
  if ($profileNames -notcontains $Profile) {
    throw "Aptos profile '$Profile' was not found. Use a dedicated Payby publisher profile."
  }
}

if (-not $Address) {
  if ($PrivateKeyFile) {
    throw "-Address is required when using -PrivateKeyFile so the package address is explicit."
  }
  $lookup = aptos account lookup-address --profile $Profile
  if ($LASTEXITCODE -ne 0) {
    throw "Could not resolve the account address for profile '$Profile'."
  }
  $lookupJson = $lookup | ConvertFrom-Json
  $resolvedAddress = $lookupJson.Result.Trim()
  $Address = if ($resolvedAddress.StartsWith("0x")) { $resolvedAddress } else { "0x$resolvedAddress" }
}

if (-not $Address -or $Address -notmatch "^0x[0-9a-fA-F]+$") {
  throw "A valid Payby publisher address is required."
}

$signerLabel = if ($Profile) { $Profile } else { "local signer file" }
Write-Host "Deploying Payby Marketplace to $Network as $Address"

$nodeApiKey = $env:NODE_API_KEY
if (-not $nodeApiKey -and (Test-Path -LiteralPath $envPath)) {
  $apiKeyNames = if ($Network -eq "shelbynet") {
    @("PAYBY_APTOS_SHELBYNET_API_KEY", "VITE_APTOS_SHELBYNET_API_KEY", "VITE_SHELBYNET_API_KEY")
  } else {
    @("PAYBY_APTOS_TESTNET_API_KEY", "VITE_APTOS_TESTNET_API_KEY", "VITE_SHELBY_TESTNET_API_KEY")
  }
  $dotenvLine = Get-Content -LiteralPath $envPath | Where-Object {
    $key = ($_ -split "=", 2)[0]
    $apiKeyNames -contains $key
  } | Select-Object -First 1
  if ($dotenvLine) {
    $nodeApiKey = ($dotenvLine -split "=", 2)[1].Trim().Trim('"').Trim("'")
  }
}

$publishArgs = @(
  "move", "publish",
  "--package-dir", $packageDir,
  "--named-addresses", "payby_marketplace=$Address",
  "--skip-fetch-latest-git-deps",
  "--gas-unit-price", $GasUnitPrice,
  "--max-gas", $PublishMaxGas,
  "--assume-yes"
)
$publishArgs += $signerArgs
if ($Profile) { $publishArgs += @("--profile", $Profile) }
if ($nodeUrl) { $publishArgs += @("--url", $nodeUrl) }
if ($nodeApiKey) { $publishArgs += @("--node-api-key", $nodeApiKey) }

$initArgs = @(
  "move", "run",
  "--function-id", "$Address::payby_marketplace::initialize",
  "--gas-unit-price", $GasUnitPrice,
  "--max-gas", $InitMaxGas,
  "--assume-yes"
)
$initArgs += $signerArgs
if ($Profile) { $initArgs += @("--profile", $Profile) }
if ($nodeUrl) { $initArgs += @("--url", $nodeUrl) }
if ($nodeApiKey) { $initArgs += @("--node-api-key", $nodeApiKey) }

if ($PrivateKeyFile) {
  $payloadDir = Join-Path $repoRoot ".aptos"
  if (-not (Test-Path -LiteralPath $payloadDir -PathType Container)) {
    New-Item -ItemType Directory -Path $payloadDir | Out-Null
  }
  $payloadPath = Join-Path $payloadDir "payby-publish-payload.json"
  & aptos move build-publish-payload `
    --package-dir $packageDir `
    --named-addresses "payby_marketplace=$Address" `
    --skip-fetch-latest-git-deps `
    --json-output-file $payloadPath `
    --assume-yes
  if ($LASTEXITCODE -ne 0) {
    throw "Move publish payload build failed for $signerLabel."
  }

  $previousNodeApiKey = $env:NODE_API_KEY
  try {
    if ($nodeApiKey) { $env:NODE_API_KEY = $nodeApiKey }
    & node (Join-Path $repoRoot "scripts\deploy-payby-marketplace.mjs") `
      --network $Network `
      --private-key-file $resolvedPrivateKeyFile `
      --address $Address `
      --payload-file $payloadPath `
      --gas-unit-price $GasUnitPrice `
      --publish-max-gas $PublishMaxGas `
      --init-max-gas $InitMaxGas
    if ($LASTEXITCODE -ne 0) {
      throw "Move publish or initialize failed for $signerLabel."
    }
  } finally {
    $env:NODE_API_KEY = $previousNodeApiKey
  }
} else {
  & aptos @publishArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Move publish failed for $signerLabel."
  }

  & aptos @initArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Marketplace initialize failed for $signerLabel."
  }
}

if ($UpdateEnv) {
  if (-not (Test-Path -LiteralPath $envPath)) {
    New-Item -ItemType File -Path $envPath | Out-Null
  }

  $envContent = Get-Content -LiteralPath $envPath -Raw
  $updates = [ordered]@{}

  if ($Network -eq "testnet") {
    $updates["VITE_PAYBY_TESTNET_MARKETPLACE_ADDRESS"] = $Address
    $updates["PAYBY_TESTNET_MARKETPLACE_ADDRESS"] = $Address
  } else {
    $updates["VITE_PAYBY_SHELBYNET_MARKETPLACE_ADDRESS"] = $Address
    $updates["PAYBY_SHELBYNET_MARKETPLACE_ADDRESS"] = $Address
  }

  if ($PaymentAssetMetadata) {
    $updates["VITE_PAYBY_PAYMENT_ASSET_METADATA"] = $PaymentAssetMetadata
  }

  foreach ($key in $updates.Keys) {
    $line = "$key=$($updates[$key])"
    if ($envContent -match "(?m)^$([regex]::Escape($key))=") {
      $envContent = [regex]::Replace(
        $envContent,
        "(?m)^$([regex]::Escape($key))=.*$",
        $line
      )
    } else {
      if ($envContent -and -not $envContent.EndsWith("`n")) {
        $envContent += "`n"
      }
      $envContent += "$line`n"
    }
  }

  Set-Content -LiteralPath $envPath -Value $envContent -NoNewline
  Write-Host "Updated .env marketplace values."
}

Write-Host "Payby Marketplace ready at $Address"
