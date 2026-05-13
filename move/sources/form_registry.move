/// FormRegistry: manages form metadata on Sui. Each form is a shared object
/// pointing to the current schema blob on Walrus. Editing creates a new version.
module sonar::form_registry {
    use std::string::String;
    use sui::event;

    /// A form registered on Sonar. Shared object — the owner can update it.
    public struct Form has key, store {
        id: UID,
        owner: address,
        title: String,
        current_blob_id: String,
        version: u64,
        encrypted: bool,
        policy_package_id: Option<address>,
        created_at: u64,
    }

    /// Emitted when a form is created.
    public struct FormCreated has copy, drop {
        form_id: address,
        owner: address,
        blob_id: String,
        version: u64,
    }

    /// Emitted when a form schema is updated.
    public struct FormUpdated has copy, drop {
        form_id: address,
        old_blob_id: String,
        new_blob_id: String,
        version: u64,
    }

    /// Create a new form. The schema blob must already be uploaded to Walrus.
    public fun create_form(
        title: String,
        blob_id: String,
        encrypted: bool,
        ctx: &mut TxContext,
    ) {
        let form = Form {
            id: object::new(ctx),
            owner: ctx.sender(),
            title,
            current_blob_id: blob_id,
            version: 1,
            encrypted,
            policy_package_id: option::none(),
            created_at: 0, // TODO: use clock
        };

        event::emit(FormCreated {
            form_id: object::id_address(&form),
            owner: ctx.sender(),
            blob_id: form.current_blob_id,
            version: 1,
        });

        transfer::share_object(form);
    }

    /// Returns the owner address of the form.
    public fun owner(form: &Form): address {
        form.owner
    }

    /// Update form schema to a new Walrus blob. Only the owner can do this.
    public fun update_form(
        form: &mut Form,
        new_blob_id: String,
        ctx: &mut TxContext,
    ) {
        assert!(form.owner == ctx.sender(), 0);

        let old_blob_id = form.current_blob_id;
        form.current_blob_id = new_blob_id;
        form.version = form.version + 1;

        event::emit(FormUpdated {
            form_id: object::id_address(form),
            old_blob_id,
            new_blob_id: form.current_blob_id,
            version: form.version,
        });
    }
}
