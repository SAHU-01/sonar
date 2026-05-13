/// Submissions module: records individual submissions and optional Merkle batches.
/// Each submission is stored on Walrus; the blob ID is recorded on Sui via events.
/// No database — Sui events ARE the index.
module sonar::submission_batch {
    use std::string::String;
    use sui::event;

    /// Emitted for every submission. This is the primary index for finding
    /// submissions — query these events filtered by form_id.
    public struct SubmissionRecorded has copy, drop {
        form_id: address,
        blob_id: String,
        submitter: address,
        encrypted: bool,
        form_version: u64,
    }

    /// Record a submission. Anyone can call this for public forms.
    /// The actual submission data lives on Walrus at blob_id.
    public fun record_submission(
        form_id: address,
        blob_id: String,
        encrypted: bool,
        form_version: u64,
        ctx: &mut TxContext,
    ) {
        event::emit(SubmissionRecorded {
            form_id,
            blob_id,
            submitter: ctx.sender(),
            encrypted,
            form_version,
        });
    }

    // --- Optional: Merkle batch for tamper-evidence ---

    /// Tracks batch history for a form (for verification page).
    public struct BatchRegistry has key, store {
        id: UID,
        form_id: address,
        owner: address,
        batch_count: u64,
        latest_merkle_root: String,
        latest_blob_id: String,
        submission_count: u64,
    }

    public struct BatchCommitted has copy, drop {
        registry_id: address,
        form_id: address,
        batch_number: u64,
        merkle_root: String,
        blob_id: String,
        submission_count: u64,
    }

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
            submission_count: 0,
        };
        transfer::share_object(registry);
    }

    public fun commit_batch(
        registry: &mut BatchRegistry,
        merkle_root: String,
        blob_id: String,
        submission_count: u64,
        ctx: &mut TxContext,
    ) {
        assert!(registry.owner == ctx.sender(), 0);

        registry.batch_count = registry.batch_count + 1;
        registry.latest_merkle_root = merkle_root;
        registry.latest_blob_id = blob_id;
        registry.submission_count = registry.submission_count + submission_count;

        event::emit(BatchCommitted {
            registry_id: object::id_address(registry),
            form_id: registry.form_id,
            batch_number: registry.batch_count,
            merkle_root: registry.latest_merkle_root,
            blob_id: registry.latest_blob_id,
            submission_count: registry.submission_count,
        });
    }
}
