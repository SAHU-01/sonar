/// Seal policy: owner-only decryption. The seal_approve function is called
/// by Seal key servers via dry_run_transaction_block to verify decryption access.
/// It must be a non-public entry function, take id: vector<u8> as first arg,
/// and abort if access is denied.
module sonar::policy_owner_only {
    use sonar::form_registry::{Self, Form};

    const ENoAccess: u64 = 0;
    const EInvalidId: u64 = 1;

    /// Called by Seal key servers to verify decryption access.
    /// Approves only if the transaction sender is the form owner.
    /// The `id` must start with the Form object's ID bytes (the Seal convention).
    entry fun seal_approve(id: vector<u8>, form: &Form, ctx: &TxContext) {
        // Verify the id starts with the form's object ID bytes
        let form_id_bytes = object::id_address(form).to_bytes();
        let id_len = id.length();
        let prefix_len = form_id_bytes.length();
        assert!(id_len >= prefix_len, EInvalidId);

        let mut i = 0;
        while (i < prefix_len) {
            assert!(id[i] == form_id_bytes[i], EInvalidId);
            i = i + 1;
        };

        // Verify the caller is the form owner
        assert!(form_registry::owner(form) == ctx.sender(), ENoAccess);
    }
}
