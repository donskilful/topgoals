"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createUser, updateUser } from "@/lib/actions/users";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { MIN_PASSWORD_LENGTH } from "@/lib/schemas/user";
import {
  FormAlert,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/form-fields";

const ROLE_OPTIONS = [
  { value: "moderator", label: "Moderator — can manage content" },
  { value: "admin", label: "Administrator — full access, including staff" },
  { value: "user", label: "User — no CMS access (reserved for future site accounts)" },
];

export type UserFormValues = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function UserForm({ user }: { user?: UserFormValues }) {
  const isEdit = Boolean(user);
  const [state, formAction] = useActionState(
    isEdit ? updateUser : createUser,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {isEdit ? <input type="hidden" name="id" value={user!.id} /> : null}

      <FormAlert state={state} />

      <TextField
        name="name"
        label="Full name"
        required
        defaultValue={user?.name}
        error={state.fieldErrors.name}
        autoComplete="off"
      />

      <TextField
        name="email"
        label="Email"
        type="email"
        required
        defaultValue={user?.email}
        error={state.fieldErrors.email}
        autoComplete="off"
      />

      <TextField
        name="password"
        label={isEdit ? "New password" : "Temporary password"}
        type="password"
        required={!isEdit}
        minLength={MIN_PASSWORD_LENGTH}
        error={state.fieldErrors.password}
        autoComplete="new-password"
        hint={
          isEdit
            ? "Leave blank to keep the current password."
            : `At least ${MIN_PASSWORD_LENGTH} characters. Share it with them directly and ask them to change it after signing in.`
        }
      />

      <SelectField
        name="role"
        label="Role"
        required
        defaultValue={user?.role ?? "moderator"}
        options={ROLE_OPTIONS}
        error={state.fieldErrors.role}
      />

      <div className="mt-2 flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Create account"}</SubmitButton>
        <Link
          href="/admin/users"
          className="text-[13px] font-semibold text-floodlight-dim hover:text-floodlight"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
