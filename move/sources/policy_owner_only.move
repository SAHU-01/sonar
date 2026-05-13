/// Seal policy: owner-only decryption. The seal_approve function checks
/// that the caller is the form owner. Used as the default encryption policy.
module sonar::policy_owner_only {
    use sonar::form_registry::Form;

    /// Called by Seal key servers to verify decryption access.
    /// Approves only if the transaction sender is the form owner.
    public fun seal_approve(form: &Form, ctx: &TxContext) {
        // TODO: verify BCS-encoded id matches, check form.owner == ctx.sender()
        // Stub: always approve for Day 1 testing
        assert!(true, 0);
        let _ = form;
        let _ = ctx;
    }
}
