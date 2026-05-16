module payby_marketplace::payby_marketplace {
    use std::string::String;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::object;
    use aptos_framework::primary_fungible_store;
    use aptos_framework::signer;
    use aptos_std::table::{Self, Table};

    const E_NOT_AUTHORIZED: u64 = 1;
    const E_LISTING_EXISTS: u64 = 2;
    const E_LISTING_NOT_FOUND: u64 = 3;
    const E_UNSUPPORTED_POLICY: u64 = 4;
    const E_PAYMENT_ASSET_REQUIRED: u64 = 5;

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
    ) acquires Registry {
        let registry = borrow_global_mut<Registry>(@payby_marketplace);
        assert!(table::contains(&registry.listings, blob_name), E_LISTING_NOT_FOUND);
        let listing = table::borrow(&registry.listings, blob_name);
        assert!(listing.active, E_LISTING_NOT_FOUND);
        let owner = listing.owner;
        let price = listing.price;
        let payment_metadata = listing.payment_metadata;

        if (price > 0) {
            let metadata = object::address_to_object<Metadata>(payment_metadata);
            primary_fungible_store::transfer(
                buyer,
                metadata,
                owner,
                price,
            );
        };

        let buyer_addr = signer::address_of(buyer);
        if (!table::contains(&registry.purchases, buyer_addr)) {
            table::add(&mut registry.purchases, buyer_addr, vector::empty<String>());
        };
        let purchases = table::borrow_mut(&mut registry.purchases, buyer_addr);
        if (!vector::contains(purchases, &blob_name)) {
            vector::push_back(purchases, blob_name);
        };

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
}
