module payby_marketplace::payby_marketplace {
    use std::string::String;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::object;
    use aptos_framework::primary_fungible_store;
    use aptos_framework::signer;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};

    const E_NOT_AUTHORIZED: u64 = 1;
    const E_LISTING_EXISTS: u64 = 2;
    const E_LISTING_NOT_FOUND: u64 = 3;
    const E_UNSUPPORTED_POLICY: u64 = 4;
    const E_PAYMENT_ASSET_REQUIRED: u64 = 5;
    const E_PURCHASE_UNAVAILABLE: u64 = 6;
    const E_PRICE_REQUIRED: u64 = 7;
    const E_ALREADY_PURCHASED: u64 = 8;

    const POLICY_FREE: u8 = 0;
    const POLICY_ALLOWLIST: u8 = 1;
    const POLICY_PAID: u8 = 2;
    const POLICY_NFT: u8 = 3;
    const POLICY_SUBSCRIPTION: u8 = 4;

    struct Listing has store, copy, drop {
        owner: address,
        blob_name: String,
        title: String,
        policy: u8,
        price: u64,
        payment_metadata: address,
        allowlist: vector<address>,
        active: bool,
    }

    struct Registry has key {
        listings: Table<String, Listing>,
        purchases: Table<address, vector<String>>,
        listing_keys: vector<String>,
    }

    struct OwnerListings has store {
        listings: Table<String, Listing>,
        listing_keys: vector<String>,
    }

    struct OwnerRegistry has key {
        owners: Table<address, OwnerListings>,
    }

    struct ListingMetadata has store, copy, drop {
        metadata_uri: String,
        metadata_hash: String,
    }

    struct MetadataRegistry has key {
        metadata: Table<String, ListingMetadata>,
    }

    struct OwnerMetadata has store {
        metadata: Table<String, ListingMetadata>,
    }

    struct OwnerMetadataRegistry has key {
        owners: Table<address, OwnerMetadata>,
    }

    struct BuyerPurchases has store {
        creators: Table<address, vector<String>>,
    }

    struct PurchaseRegistry has key {
        buyers: Table<address, BuyerPurchases>,
    }

    struct BuyerPurchaseRecord has store, copy, drop {
        owner: address,
        blob_name: String,
        price: u64,
        payment_metadata: address,
        purchased_at_secs: u64,
    }

    struct BuyerPurchaseRecords has store {
        records: vector<BuyerPurchaseRecord>,
    }

    struct PurchaseIndex has key {
        buyers: Table<address, BuyerPurchaseRecords>,
    }

    struct OwnerSalesStats has store, copy, drop {
        sale_count: u64,
        revenue: u64,
    }

    struct SalesRegistry has key {
        owners: Table<address, OwnerSalesStats>,
    }

    struct OwnerListingSales has store {
        listings: Table<String, OwnerSalesStats>,
    }

    struct ListingSalesRegistry has key {
        owners: Table<address, OwnerListingSales>,
    }

    struct CreatorProfile has store, copy, drop {
        display_name: String,
        handle: String,
        bio: String,
        avatar_url: String,
        website: String,
        updated_at_secs: u64,
    }

    struct ProfileRegistry has key {
        profiles: Table<address, CreatorProfile>,
    }

    struct CreatorProfileV2 has store, copy, drop {
        display_name: String,
        handle: String,
        bio: String,
        avatar_url: String,
        website: String,
        x_handle: String,
        x_verified: bool,
        updated_at_secs: u64,
    }

    struct ProfileRegistryV2 has key {
        profiles: Table<address, CreatorProfileV2>,
    }

    #[event]
    struct ListingCreated has drop, store {
        owner: address,
        blob_name: String,
        policy: u8,
        price: u64,
    }

    #[event]
    struct ListingPurchased has drop, store {
        buyer: address,
        owner: address,
        blob_name: String,
        price: u64,
    }

    #[event]
    struct ListingDelisted has drop, store {
        owner: address,
        blob_name: String,
    }

    #[event]
    struct ListingMetadataUpdated has drop, store {
        owner: address,
        blob_name: String,
        metadata_uri: String,
        metadata_hash: String,
    }

    #[event]
    struct CreatorProfileUpdated has drop, store {
        owner: address,
        handle: String,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @payby_marketplace, E_NOT_AUTHORIZED);

        if (!exists<Registry>(admin_addr)) {
            move_to(admin, Registry {
                listings: table::new<String, Listing>(),
                purchases: table::new<address, vector<String>>(),
                listing_keys: vector::empty<String>(),
            });
        };

        if (!exists<MetadataRegistry>(admin_addr)) {
            move_to(admin, MetadataRegistry {
                metadata: table::new<String, ListingMetadata>(),
            });
        };

        if (!exists<OwnerRegistry>(admin_addr)) {
            move_to(admin, OwnerRegistry {
                owners: table::new<address, OwnerListings>(),
            });
        };

        if (!exists<OwnerMetadataRegistry>(admin_addr)) {
            move_to(admin, OwnerMetadataRegistry {
                owners: table::new<address, OwnerMetadata>(),
            });
        };

        if (!exists<PurchaseRegistry>(admin_addr)) {
            move_to(admin, PurchaseRegistry {
                buyers: table::new<address, BuyerPurchases>(),
            });
        };

        if (!exists<PurchaseIndex>(admin_addr)) {
            move_to(admin, PurchaseIndex {
                buyers: table::new<address, BuyerPurchaseRecords>(),
            });
        };

        if (!exists<SalesRegistry>(admin_addr)) {
            move_to(admin, SalesRegistry {
                owners: table::new<address, OwnerSalesStats>(),
            });
        };

        if (!exists<ListingSalesRegistry>(admin_addr)) {
            move_to(admin, ListingSalesRegistry {
                owners: table::new<address, OwnerListingSales>(),
            });
        };

        if (!exists<ProfileRegistry>(admin_addr)) {
            move_to(admin, ProfileRegistry {
                profiles: table::new<address, CreatorProfile>(),
            });
        };

        if (!exists<ProfileRegistryV2>(admin_addr)) {
            move_to(admin, ProfileRegistryV2 {
                profiles: table::new<address, CreatorProfileV2>(),
            });
        };
    }

    public entry fun upsert_listing(
        owner: &signer,
        blob_name: String,
        title: String,
        policy: u8,
        price: u64,
        payment_metadata: address,
        allowlist: vector<address>,
    ) acquires Registry {
        assert_supported_policy(policy, payment_metadata);

        let owner_addr = signer::address_of(owner);
        let registry = borrow_global_mut<Registry>(@payby_marketplace);
        if (table::contains(&registry.listings, blob_name)) {
            let listing = table::borrow_mut(&mut registry.listings, blob_name);
            assert!(listing.owner == owner_addr, E_NOT_AUTHORIZED);
            listing.title = title;
            listing.policy = policy;
            listing.price = price;
            listing.payment_metadata = payment_metadata;
            listing.allowlist = allowlist;
            listing.active = true;
        } else {
            let listing = Listing {
                owner: owner_addr,
                blob_name,
                title,
                policy,
                price,
                payment_metadata,
                allowlist,
                active: true,
            };
            table::add(&mut registry.listings, blob_name, listing);
            vector::push_back(&mut registry.listing_keys, blob_name);

            event::emit(ListingCreated {
                owner: owner_addr,
                blob_name,
                policy,
                price,
            });
        };
    }

    public entry fun upsert_listing_with_metadata(
        owner: &signer,
        blob_name: String,
        title: String,
        policy: u8,
        price: u64,
        payment_metadata: address,
        allowlist: vector<address>,
        metadata_uri: String,
        metadata_hash: String,
    ) acquires Registry, MetadataRegistry {
        upsert_listing_internal(
            owner,
            blob_name,
            title,
            policy,
            price,
            payment_metadata,
            allowlist,
        );
        upsert_listing_metadata_internal(owner, blob_name, metadata_uri, metadata_hash);
    }

    public entry fun upsert_listing_metadata(
        owner: &signer,
        blob_name: String,
        metadata_uri: String,
        metadata_hash: String,
    ) acquires Registry, MetadataRegistry {
        upsert_listing_metadata_internal(owner, blob_name, metadata_uri, metadata_hash);
    }

    public entry fun upsert_listing_for_owner_with_metadata(
        owner: &signer,
        blob_name: String,
        title: String,
        policy: u8,
        price: u64,
        payment_metadata: address,
        allowlist: vector<address>,
        metadata_uri: String,
        metadata_hash: String,
    ) acquires OwnerRegistry, OwnerMetadataRegistry {
        assert_supported_policy(policy, payment_metadata);
        if (policy == POLICY_PAID) {
            assert!(price > 0, E_PRICE_REQUIRED);
        };
        let owner_addr = signer::address_of(owner);
        upsert_owner_listing_internal(
            owner_addr,
            blob_name,
            title,
            policy,
            price,
            payment_metadata,
            allowlist,
        );
        upsert_owner_metadata_internal(owner_addr, blob_name, metadata_uri, metadata_hash);
    }

    public entry fun upsert_listing_metadata_for_owner(
        owner: &signer,
        blob_name: String,
        metadata_uri: String,
        metadata_hash: String,
    ) acquires OwnerRegistry, OwnerMetadataRegistry {
        let owner_addr = signer::address_of(owner);
        assert_owner_listing(owner_addr, blob_name);
        upsert_owner_metadata_internal(owner_addr, blob_name, metadata_uri, metadata_hash);
    }

    public entry fun upsert_creator_profile(
        owner: &signer,
        display_name: String,
        handle: String,
        bio: String,
        avatar_url: String,
        website: String,
    ) acquires ProfileRegistry {
        let owner_addr = signer::address_of(owner);
        let registry = borrow_global_mut<ProfileRegistry>(@payby_marketplace);
        let profile = CreatorProfile {
            display_name,
            handle,
            bio,
            avatar_url,
            website,
            updated_at_secs: timestamp::now_seconds(),
        };

        if (table::contains(&registry.profiles, owner_addr)) {
            let current = table::borrow_mut(&mut registry.profiles, owner_addr);
            current.display_name = profile.display_name;
            current.handle = profile.handle;
            current.bio = profile.bio;
            current.avatar_url = profile.avatar_url;
            current.website = profile.website;
            current.updated_at_secs = profile.updated_at_secs;
        } else {
            table::add(&mut registry.profiles, owner_addr, profile);
        };

        event::emit(CreatorProfileUpdated {
            owner: owner_addr,
            handle,
        });
    }

    public entry fun upsert_creator_profile_v2(
        owner: &signer,
        display_name: String,
        handle: String,
        bio: String,
        avatar_url: String,
        website: String,
        x_handle: String,
        x_verified: bool,
    ) acquires ProfileRegistryV2 {
        let owner_addr = signer::address_of(owner);
        let registry = borrow_global_mut<ProfileRegistryV2>(@payby_marketplace);
        let profile = CreatorProfileV2 {
            display_name,
            handle,
            bio,
            avatar_url,
            website,
            x_handle,
            x_verified,
            updated_at_secs: timestamp::now_seconds(),
        };

        if (table::contains(&registry.profiles, owner_addr)) {
            let current = table::borrow_mut(&mut registry.profiles, owner_addr);
            current.display_name = profile.display_name;
            current.handle = profile.handle;
            current.bio = profile.bio;
            current.avatar_url = profile.avatar_url;
            current.website = profile.website;
            current.x_handle = profile.x_handle;
            current.x_verified = profile.x_verified;
            current.updated_at_secs = profile.updated_at_secs;
        } else {
            table::add(&mut registry.profiles, owner_addr, profile);
        };

        event::emit(CreatorProfileUpdated {
            owner: owner_addr,
            handle,
        });
    }

    public entry fun create_listing(
        owner: &signer,
        blob_name: String,
        title: String,
        policy: u8,
        price: u64,
        payment_metadata: address,
        allowlist: vector<address>,
    ) acquires Registry {
        assert_supported_policy(policy, payment_metadata);

        let registry = borrow_global_mut<Registry>(@payby_marketplace);
        assert!(!table::contains(&registry.listings, blob_name), E_LISTING_EXISTS);

        let listing = Listing {
            owner: signer::address_of(owner),
            blob_name,
            title,
            policy,
            price,
            payment_metadata,
            allowlist,
            active: true,
        };
        table::add(&mut registry.listings, blob_name, listing);
        vector::push_back(&mut registry.listing_keys, blob_name);

        event::emit(ListingCreated {
            owner: signer::address_of(owner),
            blob_name,
            policy,
            price,
        });
    }

    public entry fun update_listing(
        owner: &signer,
        blob_name: String,
        title: String,
        policy: u8,
        price: u64,
        payment_metadata: address,
        allowlist: vector<address>,
        active: bool,
    ) acquires Registry {
        assert_supported_policy(policy, payment_metadata);

        let registry = borrow_global_mut<Registry>(@payby_marketplace);
        assert!(table::contains(&registry.listings, blob_name), E_LISTING_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.listings, blob_name);
        assert!(listing.owner == signer::address_of(owner), E_NOT_AUTHORIZED);

        listing.title = title;
        listing.policy = policy;
        listing.price = price;
        listing.payment_metadata = payment_metadata;
        listing.allowlist = allowlist;
        listing.active = active;
    }

    public entry fun purchase(
        buyer: &signer,
        blob_name: String,
    ) acquires Registry, SalesRegistry, ListingSalesRegistry {
        let registry = borrow_global_mut<Registry>(@payby_marketplace);
        assert!(table::contains(&registry.listings, blob_name), E_LISTING_NOT_FOUND);
        let listing = table::borrow(&registry.listings, blob_name);
        assert!(listing.active, E_LISTING_NOT_FOUND);
        let owner = listing.owner;
        let price = listing.price;
        let payment_metadata = listing.payment_metadata;
        let buyer_addr = signer::address_of(buyer);

        if (!table::contains(&registry.purchases, buyer_addr)) {
            table::add(&mut registry.purchases, buyer_addr, vector::empty<String>());
        };
        let purchases = table::borrow_mut(&mut registry.purchases, buyer_addr);
        assert!(!vector::contains(purchases, &blob_name), E_ALREADY_PURCHASED);
        assert!(price > 0, E_PRICE_REQUIRED);

        let metadata = object::address_to_object<Metadata>(payment_metadata);
        primary_fungible_store::transfer(
            buyer,
            metadata,
            owner,
            price,
        );

        vector::push_back(purchases, blob_name);
        record_owner_sale(owner, blob_name, price);

        event::emit(ListingPurchased {
            buyer: buyer_addr,
            owner,
            blob_name,
            price,
        });
    }

    public entry fun purchase_from(
        buyer: &signer,
        owner: address,
        blob_name: String,
    ) acquires OwnerRegistry, PurchaseRegistry, PurchaseIndex, SalesRegistry, ListingSalesRegistry {
        let owner_registry = borrow_global<OwnerRegistry>(@payby_marketplace);
        assert!(table::contains(&owner_registry.owners, owner), E_LISTING_NOT_FOUND);
        let owner_listings = table::borrow(&owner_registry.owners, owner);
        assert!(table::contains(&owner_listings.listings, blob_name), E_LISTING_NOT_FOUND);
        let listing = table::borrow(&owner_listings.listings, blob_name);
        assert!(listing.active, E_LISTING_NOT_FOUND);
        assert!(listing.policy == POLICY_PAID, E_PURCHASE_UNAVAILABLE);
        let price = listing.price;
        let payment_metadata = listing.payment_metadata;
        let buyer_addr = signer::address_of(buyer);

        assert!(price > 0, E_PRICE_REQUIRED);
        assert!(
            !has_owner_purchase_internal(buyer_addr, owner, &blob_name),
            E_ALREADY_PURCHASED,
        );

        let metadata = object::address_to_object<Metadata>(payment_metadata);
        primary_fungible_store::transfer(
            buyer,
            metadata,
            owner,
            price,
        );

        record_owner_purchase(buyer_addr, owner, blob_name);
        record_purchase_index(
            buyer_addr,
            owner,
            blob_name,
            price,
            payment_metadata,
        );
        record_owner_sale(owner, blob_name, price);

        event::emit(ListingPurchased {
            buyer: buyer_addr,
            owner,
            blob_name,
            price,
        });
    }

    public entry fun delist(
        owner: &signer,
        blob_name: String,
    ) acquires Registry {
        let registry = borrow_global_mut<Registry>(@payby_marketplace);
        assert!(table::contains(&registry.listings, blob_name), E_LISTING_NOT_FOUND);
        let listing = table::borrow_mut(&mut registry.listings, blob_name);
        assert!(listing.owner == signer::address_of(owner), E_NOT_AUTHORIZED);
        listing.active = false;

        event::emit(ListingDelisted {
            owner: signer::address_of(owner),
            blob_name,
        });
    }

    public entry fun delist_for_owner(
        owner: &signer,
        blob_name: String,
    ) acquires OwnerRegistry {
        let owner_addr = signer::address_of(owner);
        let registry = borrow_global_mut<OwnerRegistry>(@payby_marketplace);
        assert!(table::contains(&registry.owners, owner_addr), E_LISTING_NOT_FOUND);
        let owner_listings = table::borrow_mut(&mut registry.owners, owner_addr);
        assert!(table::contains(&owner_listings.listings, blob_name), E_LISTING_NOT_FOUND);
        let listing = table::borrow_mut(&mut owner_listings.listings, blob_name);
        listing.active = false;

        event::emit(ListingDelisted {
            owner: owner_addr,
            blob_name,
        });
    }

    #[view]
    public fun get_listing(blob_name: String): (address, String, u8, u64, address, bool) acquires Registry {
        if (!exists<Registry>(@payby_marketplace)) {
            return (@0x0, std::string::utf8(b""), POLICY_FREE, 0, @0x0, false)
        };

        let registry = borrow_global<Registry>(@payby_marketplace);
        if (!table::contains(&registry.listings, blob_name)) {
            return (@0x0, std::string::utf8(b""), POLICY_FREE, 0, @0x0, false)
        };

        let listing = table::borrow(&registry.listings, blob_name);
        (
            listing.owner,
            listing.title,
            listing.policy,
            listing.price,
            listing.payment_metadata,
            listing.active,
        )
    }

    #[view]
    public fun get_listing_for_owner(owner: address, blob_name: String): (address, String, u8, u64, address, bool) acquires OwnerRegistry {
        if (!exists<OwnerRegistry>(@payby_marketplace)) {
            return (@0x0, std::string::utf8(b""), POLICY_FREE, 0, @0x0, false)
        };

        let registry = borrow_global<OwnerRegistry>(@payby_marketplace);
        if (!table::contains(&registry.owners, owner)) {
            return (@0x0, std::string::utf8(b""), POLICY_FREE, 0, @0x0, false)
        };

        let owner_listings = table::borrow(&registry.owners, owner);
        if (!table::contains(&owner_listings.listings, blob_name)) {
            return (@0x0, std::string::utf8(b""), POLICY_FREE, 0, @0x0, false)
        };

        let listing = table::borrow(&owner_listings.listings, blob_name);
        (
            listing.owner,
            listing.title,
            listing.policy,
            listing.price,
            listing.payment_metadata,
            listing.active,
        )
    }

    #[view]
    public fun get_listing_metadata(blob_name: String): (String, String, bool) acquires MetadataRegistry {
        if (!exists<MetadataRegistry>(@payby_marketplace)) {
            return (std::string::utf8(b""), std::string::utf8(b""), false)
        };

        let registry = borrow_global<MetadataRegistry>(@payby_marketplace);
        if (!table::contains(&registry.metadata, blob_name)) {
            return (std::string::utf8(b""), std::string::utf8(b""), false)
        };

        let metadata = table::borrow(&registry.metadata, blob_name);
        (metadata.metadata_uri, metadata.metadata_hash, true)
    }

    #[view]
    public fun get_listing_metadata_for_owner(owner: address, blob_name: String): (String, String, bool) acquires OwnerMetadataRegistry {
        if (!exists<OwnerMetadataRegistry>(@payby_marketplace)) {
            return (std::string::utf8(b""), std::string::utf8(b""), false)
        };

        let registry = borrow_global<OwnerMetadataRegistry>(@payby_marketplace);
        if (!table::contains(&registry.owners, owner)) {
            return (std::string::utf8(b""), std::string::utf8(b""), false)
        };

        let owner_metadata = table::borrow(&registry.owners, owner);
        if (!table::contains(&owner_metadata.metadata, blob_name)) {
            return (std::string::utf8(b""), std::string::utf8(b""), false)
        };

        let metadata = table::borrow(&owner_metadata.metadata, blob_name);
        (metadata.metadata_uri, metadata.metadata_hash, true)
    }

    #[view]
    public fun get_listing_count(): u64 acquires Registry {
        if (!exists<Registry>(@payby_marketplace)) {
            return 0
        };

        vector::length(&borrow_global<Registry>(@payby_marketplace).listing_keys)
    }

    #[view]
    public fun get_listing_key(index: u64): String acquires Registry {
        if (!exists<Registry>(@payby_marketplace)) {
            return std::string::utf8(b"")
        };

        let registry = borrow_global<Registry>(@payby_marketplace);
        if (index >= vector::length(&registry.listing_keys)) {
            return std::string::utf8(b"")
        };

        *vector::borrow(&registry.listing_keys, index)
    }

    #[view]
    public fun get_listing_count_for_owner(owner: address): u64 acquires OwnerRegistry {
        if (!exists<OwnerRegistry>(@payby_marketplace)) {
            return 0
        };

        let registry = borrow_global<OwnerRegistry>(@payby_marketplace);
        if (!table::contains(&registry.owners, owner)) {
            return 0
        };

        vector::length(&table::borrow(&registry.owners, owner).listing_keys)
    }

    #[view]
    public fun get_listing_key_for_owner(owner: address, index: u64): String acquires OwnerRegistry {
        if (!exists<OwnerRegistry>(@payby_marketplace)) {
            return std::string::utf8(b"")
        };

        let registry = borrow_global<OwnerRegistry>(@payby_marketplace);
        if (!table::contains(&registry.owners, owner)) {
            return std::string::utf8(b"")
        };

        let owner_listings = table::borrow(&registry.owners, owner);
        if (index >= vector::length(&owner_listings.listing_keys)) {
            return std::string::utf8(b"")
        };

        *vector::borrow(&owner_listings.listing_keys, index)
    }

    #[view]
    public fun get_purchases(user: address): vector<String> acquires Registry {
        if (!exists<Registry>(@payby_marketplace)) {
            return vector::empty<String>()
        };

        let registry = borrow_global<Registry>(@payby_marketplace);
        if (!table::contains(&registry.purchases, user)) {
            return vector::empty<String>()
        };

        *table::borrow(&registry.purchases, user)
    }

    #[view]
    public fun get_purchases_from_owner(user: address, owner: address): vector<String> acquires PurchaseRegistry {
        if (!exists<PurchaseRegistry>(@payby_marketplace)) {
            return vector::empty<String>()
        };

        let registry = borrow_global<PurchaseRegistry>(@payby_marketplace);
        if (!table::contains(&registry.buyers, user)) {
            return vector::empty<String>()
        };

        let buyer_purchases = table::borrow(&registry.buyers, user);
        if (!table::contains(&buyer_purchases.creators, owner)) {
            return vector::empty<String>()
        };

        *table::borrow(&buyer_purchases.creators, owner)
    }

    #[view]
    public fun get_purchase_record_count(user: address): u64 acquires PurchaseIndex {
        if (!exists<PurchaseIndex>(@payby_marketplace)) {
            return 0
        };

        let registry = borrow_global<PurchaseIndex>(@payby_marketplace);
        if (!table::contains(&registry.buyers, user)) {
            return 0
        };

        vector::length(&table::borrow(&registry.buyers, user).records)
    }

    #[view]
    public fun get_purchase_record(
        user: address,
        index: u64,
    ): (address, String, u64, address, u64, bool) acquires PurchaseIndex {
        if (!exists<PurchaseIndex>(@payby_marketplace)) {
            return (@0x0, std::string::utf8(b""), 0, @0x0, 0, false)
        };

        let registry = borrow_global<PurchaseIndex>(@payby_marketplace);
        if (!table::contains(&registry.buyers, user)) {
            return (@0x0, std::string::utf8(b""), 0, @0x0, 0, false)
        };

        let buyer_records = table::borrow(&registry.buyers, user);
        if (index >= vector::length(&buyer_records.records)) {
            return (@0x0, std::string::utf8(b""), 0, @0x0, 0, false)
        };

        let record = vector::borrow(&buyer_records.records, index);
        (
            record.owner,
            record.blob_name,
            record.price,
            record.payment_metadata,
            record.purchased_at_secs,
            true,
        )
    }

    #[view]
    public fun get_sales_summary(owner: address): (u64, u64) acquires SalesRegistry {
        if (!exists<SalesRegistry>(@payby_marketplace)) {
            return (0, 0)
        };

        let registry = borrow_global<SalesRegistry>(@payby_marketplace);
        if (!table::contains(&registry.owners, owner)) {
            return (0, 0)
        };

        let stats = table::borrow(&registry.owners, owner);
        (stats.sale_count, stats.revenue)
    }

    #[view]
    public fun get_listing_sales_summary(
        owner: address,
        blob_name: String,
    ): (u64, u64) acquires ListingSalesRegistry {
        if (!exists<ListingSalesRegistry>(@payby_marketplace)) {
            return (0, 0)
        };

        let registry = borrow_global<ListingSalesRegistry>(@payby_marketplace);
        if (!table::contains(&registry.owners, owner)) {
            return (0, 0)
        };

        let owner_sales = table::borrow(&registry.owners, owner);
        if (!table::contains(&owner_sales.listings, blob_name)) {
            return (0, 0)
        };

        let stats = table::borrow(&owner_sales.listings, blob_name);
        (stats.sale_count, stats.revenue)
    }

    #[view]
    public fun get_creator_profile(
        owner: address,
    ): (String, String, String, String, String, u64, bool) acquires ProfileRegistry {
        if (!exists<ProfileRegistry>(@payby_marketplace)) {
            return (
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                0,
                false,
            )
        };

        let registry = borrow_global<ProfileRegistry>(@payby_marketplace);
        if (!table::contains(&registry.profiles, owner)) {
            return (
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                0,
                false,
            )
        };

        let profile = table::borrow(&registry.profiles, owner);
        (
            profile.display_name,
            profile.handle,
            profile.bio,
            profile.avatar_url,
            profile.website,
            profile.updated_at_secs,
            true,
        )
    }

    #[view]
    public fun get_creator_profile_v2(
        owner: address,
    ): (String, String, String, String, String, String, bool, u64, bool) acquires ProfileRegistryV2 {
        if (!exists<ProfileRegistryV2>(@payby_marketplace)) {
            return (
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                false,
                0,
                false,
            )
        };

        let registry = borrow_global<ProfileRegistryV2>(@payby_marketplace);
        if (!table::contains(&registry.profiles, owner)) {
            return (
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                std::string::utf8(b""),
                false,
                0,
                false,
            )
        };

        let profile = table::borrow(&registry.profiles, owner);
        (
            profile.display_name,
            profile.handle,
            profile.bio,
            profile.avatar_url,
            profile.website,
            profile.x_handle,
            profile.x_verified,
            profile.updated_at_secs,
            true,
        )
    }

    #[view]
    public fun can_access(user: address, blob_name: String): bool acquires Registry {
        if (!exists<Registry>(@payby_marketplace)) {
            return false
        };

        let registry = borrow_global<Registry>(@payby_marketplace);
        if (!table::contains(&registry.listings, blob_name)) {
            return false
        };

        let listing = table::borrow(&registry.listings, blob_name);
        if (!listing.active) {
            return false
        };

        if (listing.owner == user || listing.policy == POLICY_FREE) {
            return true
        };

        if (listing.policy == POLICY_ALLOWLIST) {
            return vector::contains(&listing.allowlist, &user)
        };

        if (listing.policy == POLICY_PAID) {
            if (!table::contains(&registry.purchases, user)) {
                return false
            };
            return vector::contains(table::borrow(&registry.purchases, user), &blob_name)
        };

        false
    }

    #[view]
    public fun can_access_for_owner(owner: address, user: address, blob_name: String): bool acquires OwnerRegistry, PurchaseRegistry {
        if (!exists<OwnerRegistry>(@payby_marketplace)) {
            return false
        };

        let registry = borrow_global<OwnerRegistry>(@payby_marketplace);
        if (!table::contains(&registry.owners, owner)) {
            return false
        };

        let owner_listings = table::borrow(&registry.owners, owner);
        if (!table::contains(&owner_listings.listings, blob_name)) {
            return false
        };

        let listing = table::borrow(&owner_listings.listings, blob_name);
        if (!listing.active) {
            return false
        };

        if (listing.owner == user || listing.policy == POLICY_FREE) {
            return true
        };

        if (listing.policy == POLICY_ALLOWLIST) {
            return vector::contains(&listing.allowlist, &user)
        };

        if (listing.policy == POLICY_PAID) {
            if (!exists<PurchaseRegistry>(@payby_marketplace)) {
                return false
            };
            let purchase_registry = borrow_global<PurchaseRegistry>(@payby_marketplace);
            if (!table::contains(&purchase_registry.buyers, user)) {
                return false
            };
            let buyer_purchases = table::borrow(&purchase_registry.buyers, user);
            if (!table::contains(&buyer_purchases.creators, owner)) {
                return false
            };
            return vector::contains(table::borrow(&buyer_purchases.creators, owner), &blob_name)
        };

        false
    }

    fun assert_supported_policy(policy: u8, payment_metadata: address) {
        assert!(
            policy == POLICY_FREE ||
            policy == POLICY_ALLOWLIST ||
            policy == POLICY_PAID ||
            policy == POLICY_NFT ||
            policy == POLICY_SUBSCRIPTION,
            E_UNSUPPORTED_POLICY,
        );
        if (policy == POLICY_PAID) {
            assert!(payment_metadata != @0x0, E_PAYMENT_ASSET_REQUIRED);
        };
    }

    fun upsert_listing_internal(
        owner: &signer,
        blob_name: String,
        title: String,
        policy: u8,
        price: u64,
        payment_metadata: address,
        allowlist: vector<address>,
    ) acquires Registry {
        assert_supported_policy(policy, payment_metadata);

        let owner_addr = signer::address_of(owner);
        let registry = borrow_global_mut<Registry>(@payby_marketplace);
        if (table::contains(&registry.listings, blob_name)) {
            let listing = table::borrow_mut(&mut registry.listings, blob_name);
            assert!(listing.owner == owner_addr, E_NOT_AUTHORIZED);
            listing.title = title;
            listing.policy = policy;
            listing.price = price;
            listing.payment_metadata = payment_metadata;
            listing.allowlist = allowlist;
            listing.active = true;
        } else {
            let listing = Listing {
                owner: owner_addr,
                blob_name,
                title,
                policy,
                price,
                payment_metadata,
                allowlist,
                active: true,
            };
            table::add(&mut registry.listings, blob_name, listing);
            vector::push_back(&mut registry.listing_keys, blob_name);

            event::emit(ListingCreated {
                owner: owner_addr,
                blob_name,
                policy,
                price,
            });
        };
    }

    fun upsert_listing_metadata_internal(
        owner: &signer,
        blob_name: String,
        metadata_uri: String,
        metadata_hash: String,
    ) acquires Registry, MetadataRegistry {
        let owner_addr = signer::address_of(owner);
        let listing_registry = borrow_global<Registry>(@payby_marketplace);
        assert!(table::contains(&listing_registry.listings, blob_name), E_LISTING_NOT_FOUND);
        let listing = table::borrow(&listing_registry.listings, blob_name);
        assert!(listing.owner == owner_addr, E_NOT_AUTHORIZED);

        let metadata_registry = borrow_global_mut<MetadataRegistry>(@payby_marketplace);
        let metadata = ListingMetadata { metadata_uri, metadata_hash };
        if (table::contains(&metadata_registry.metadata, blob_name)) {
            let current = table::borrow_mut(&mut metadata_registry.metadata, blob_name);
            current.metadata_uri = metadata.metadata_uri;
            current.metadata_hash = metadata.metadata_hash;
        } else {
            table::add(&mut metadata_registry.metadata, blob_name, metadata);
        };

        event::emit(ListingMetadataUpdated {
            owner: owner_addr,
            blob_name,
            metadata_uri,
            metadata_hash,
        });
    }

    fun assert_owner_listing(owner: address, blob_name: String) acquires OwnerRegistry {
        let registry = borrow_global<OwnerRegistry>(@payby_marketplace);
        assert!(table::contains(&registry.owners, owner), E_LISTING_NOT_FOUND);
        let owner_listings = table::borrow(&registry.owners, owner);
        assert!(table::contains(&owner_listings.listings, blob_name), E_LISTING_NOT_FOUND);
    }

    fun upsert_owner_listing_internal(
        owner: address,
        blob_name: String,
        title: String,
        policy: u8,
        price: u64,
        payment_metadata: address,
        allowlist: vector<address>,
    ) acquires OwnerRegistry {
        let registry = borrow_global_mut<OwnerRegistry>(@payby_marketplace);
        if (!table::contains(&registry.owners, owner)) {
            table::add(&mut registry.owners, owner, OwnerListings {
                listings: table::new<String, Listing>(),
                listing_keys: vector::empty<String>(),
            });
        };

        let owner_listings = table::borrow_mut(&mut registry.owners, owner);
        if (table::contains(&owner_listings.listings, blob_name)) {
            let listing = table::borrow_mut(&mut owner_listings.listings, blob_name);
            listing.title = title;
            listing.policy = policy;
            listing.price = price;
            listing.payment_metadata = payment_metadata;
            listing.allowlist = allowlist;
            listing.active = true;
        } else {
            let listing = Listing {
                owner,
                blob_name,
                title,
                policy,
                price,
                payment_metadata,
                allowlist,
                active: true,
            };
            table::add(&mut owner_listings.listings, blob_name, listing);
            vector::push_back(&mut owner_listings.listing_keys, blob_name);

            event::emit(ListingCreated {
                owner,
                blob_name,
                policy,
                price,
            });
        };
    }

    fun upsert_owner_metadata_internal(
        owner: address,
        blob_name: String,
        metadata_uri: String,
        metadata_hash: String,
    ) acquires OwnerMetadataRegistry {
        let registry = borrow_global_mut<OwnerMetadataRegistry>(@payby_marketplace);
        if (!table::contains(&registry.owners, owner)) {
            table::add(&mut registry.owners, owner, OwnerMetadata {
                metadata: table::new<String, ListingMetadata>(),
            });
        };

        let owner_metadata = table::borrow_mut(&mut registry.owners, owner);
        let metadata = ListingMetadata { metadata_uri, metadata_hash };
        if (table::contains(&owner_metadata.metadata, blob_name)) {
            let current = table::borrow_mut(&mut owner_metadata.metadata, blob_name);
            current.metadata_uri = metadata.metadata_uri;
            current.metadata_hash = metadata.metadata_hash;
        } else {
            table::add(&mut owner_metadata.metadata, blob_name, metadata);
        };

        event::emit(ListingMetadataUpdated {
            owner,
            blob_name,
            metadata_uri,
            metadata_hash,
        });
    }

    fun record_owner_purchase(
        buyer: address,
        owner: address,
        blob_name: String,
    ) acquires PurchaseRegistry {
        let registry = borrow_global_mut<PurchaseRegistry>(@payby_marketplace);
        if (!table::contains(&registry.buyers, buyer)) {
            table::add(&mut registry.buyers, buyer, BuyerPurchases {
                creators: table::new<address, vector<String>>(),
            });
        };

        let buyer_purchases = table::borrow_mut(&mut registry.buyers, buyer);
        if (!table::contains(&buyer_purchases.creators, owner)) {
            table::add(&mut buyer_purchases.creators, owner, vector::empty<String>());
        };

        let purchases = table::borrow_mut(&mut buyer_purchases.creators, owner);
        if (!vector::contains(purchases, &blob_name)) {
            vector::push_back(purchases, blob_name);
        };
    }

    fun has_owner_purchase_internal(
        buyer: address,
        owner: address,
        blob_name: &String,
    ): bool acquires PurchaseRegistry {
        if (!exists<PurchaseRegistry>(@payby_marketplace)) {
            return false
        };

        let registry = borrow_global<PurchaseRegistry>(@payby_marketplace);
        if (!table::contains(&registry.buyers, buyer)) {
            return false
        };

        let buyer_purchases = table::borrow(&registry.buyers, buyer);
        if (!table::contains(&buyer_purchases.creators, owner)) {
            return false
        };

        vector::contains(table::borrow(&buyer_purchases.creators, owner), blob_name)
    }

    fun record_purchase_index(
        buyer: address,
        owner: address,
        blob_name: String,
        price: u64,
        payment_metadata: address,
    ) acquires PurchaseIndex {
        let registry = borrow_global_mut<PurchaseIndex>(@payby_marketplace);
        if (!table::contains(&registry.buyers, buyer)) {
            table::add(&mut registry.buyers, buyer, BuyerPurchaseRecords {
                records: vector::empty<BuyerPurchaseRecord>(),
            });
        };

        let buyer_records = table::borrow_mut(&mut registry.buyers, buyer);
        vector::push_back(&mut buyer_records.records, BuyerPurchaseRecord {
            owner,
            blob_name,
            price,
            payment_metadata,
            purchased_at_secs: timestamp::now_seconds(),
        });
    }

    fun record_owner_sale(
        owner: address,
        blob_name: String,
        price: u64,
    ) acquires SalesRegistry, ListingSalesRegistry {
        let registry = borrow_global_mut<SalesRegistry>(@payby_marketplace);
        if (table::contains(&registry.owners, owner)) {
            let stats = table::borrow_mut(&mut registry.owners, owner);
            stats.sale_count = stats.sale_count + 1;
            stats.revenue = stats.revenue + price;
        } else {
            table::add(&mut registry.owners, owner, OwnerSalesStats {
                sale_count: 1,
                revenue: price,
            });
        };

        let listing_registry = borrow_global_mut<ListingSalesRegistry>(@payby_marketplace);
        if (!table::contains(&listing_registry.owners, owner)) {
            table::add(&mut listing_registry.owners, owner, OwnerListingSales {
                listings: table::new<String, OwnerSalesStats>(),
            });
        };

        let owner_sales = table::borrow_mut(&mut listing_registry.owners, owner);
        if (table::contains(&owner_sales.listings, blob_name)) {
            let stats = table::borrow_mut(&mut owner_sales.listings, blob_name);
            stats.sale_count = stats.sale_count + 1;
            stats.revenue = stats.revenue + price;
        } else {
            table::add(&mut owner_sales.listings, blob_name, OwnerSalesStats {
                sale_count: 1,
                revenue: price,
            });
        };
    }
}
