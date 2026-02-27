"use client";

import { useDashboard } from "../dashboard-context";
import { SecurityView } from "../views/security";
import { inputCls, btnPrimary, btnSecondary } from "../shared";

export default function SshPage() {
  const { selectedHostId } = useDashboard();
  return (
    <SecurityView
      hostId={selectedHostId}
      initialTab="ssh"
      inputCls={inputCls}
      btnPrimary={btnPrimary}
      btnSecondary={btnSecondary}
    />
  );
}
