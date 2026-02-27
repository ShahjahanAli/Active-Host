"use client";

import { useDashboard } from "../dashboard-context";
import { SecurityView } from "../views/security";
import { inputCls, btnPrimary, btnSecondary } from "../shared";

export default function Fail2banPage() {
  const { selectedHostId } = useDashboard();
  return (
    <SecurityView
      hostId={selectedHostId}
      initialTab="fail2ban"
      inputCls={inputCls}
      btnPrimary={btnPrimary}
      btnSecondary={btnSecondary}
    />
  );
}
