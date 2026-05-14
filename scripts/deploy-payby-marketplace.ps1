param(
  [ValidateSet("testnet", "shelbynet")]
  [string]$Network = "testnet",
  [string]$Profile = "payby-testnet",
  [string]$Address = "",
  [string]$PaymentAssetMetadata = "",
  [int]$PublishMaxGas = 200000,
  [int]$InitMaxGas = 20000,
  [switch]$UpdateEnv
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$packageDir = Join-Path $repoRoot "contracts\payby_marketplace"
$envPath = Join-Path $repoRoot ".env"
$nodeUrl = if ($Network -eq "shelbynet") {
  "https://api.shelbynet.aptoslabs.com/v1"
} else {
  ""
}

if (-not $Address) {
  $lookup = aptos account lookup-address --profile $Profile | ConvertFrom-Json
  $Address = "0x$($lookup.Result.TrimStart('0x'))"
}

Write-Host "Deploying Payby Marketplace to $Network as $Address"

aptos move publish `
  --profile $Profile `
  $(if ($nodeUrl) { @("--url", $nodeUrl) } else { @() }) `
  --package-dir $packageDir `
  --named-addresses "payby_marketplace=$Address" `
  --skip-fetch-latest-git-deps `
  --max-gas $PublishMaxGas `
  --assume-yes

aptos move run `
  --profile $Profile `
  $(if ($nodeUrl) { @("--url", $nodeUrl) } else { @() }) `
  --function-id "$Address::payby_marketplace::initialize" `
  --max-gas $InitMaxGas `
  --assume-yes

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
