/// SubmissionBatch: stores Merkle roots for batches of submissions.
/// The worker commits a new root every 10 minutes. Anyone can verify
/// inclusion of a submission hash against the on-chain root.
module sonar::submission_batch {
    use std::string::String;
    use sui::event;

    /// Tracks batch history for a form.
    public struct BatchRegistry has key, store {
        id: UID,
        form_id: address,
        owner: address,
        batch_count: u64,
        latest_merkle_root: String,
        latest_blob_id: String,
    }

    /// Emitted when a new batch is committed.
    public struct BatchCommitted has copy, drop {
        registry_id: address,
        form_id: address,
        batch_number: u64,
        merkle_root: String,
        blob_id: String,
    }

    /// Create a batch registry for a form.
    public fun create_registry(
        form_id: address,
        ctx: &mut TxContext,
    ) {
        let registry = BatchRegistry {
            id: object::new(ctx),
            form_id,
            owner: ctx.sender(),
            batch_count: 0,
            latest_merkle_root: std::string::utf8(b""),
            latest_blob_id: std::string::utf8(b""),
        };
        transfer::share_object(registry);
    }

    /// Commit a new batch. Only the owner (worker wallet) can call this.
    public fun commit_batch(
        registry: &mut BatchRegistry,
        merkle_root: String,
        blob_id: String,
        ctx: &mut TxContext,
    ) {
        assert!(registry.owner == ctx.sender(), 0);

        registry.batch_count = registry.batch_count + 1;
        registry.latest_merkle_root = merkle_root;
        registry.latest_blob_id = blob_id;

        event::emit(BatchCommitted {
            registry_id: object::id_address(registry),
            form_id: registry.form_id,
            batch_number: registry.batch_count,
            merkle_root: registry.latest_merkle_root,
            blob_id: registry.latest_blob_id,
        });
    }
}
