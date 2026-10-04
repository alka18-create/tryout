import React from "react";
import { TryoutForm } from "@/components/teacher/tryout-form";

export const metadata = {
  title: "Buat Paket Tryout Baru - TryoutKu",
  description: "Formulir pembuatan paket tryout baru untuk guru.",
};

export default function NewTryoutPage() {
  return <TryoutForm isEditing={false} />;
}
