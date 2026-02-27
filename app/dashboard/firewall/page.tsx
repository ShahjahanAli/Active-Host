"use client";

import { useDashboard } from "../dashboard-context";
import { InfrastructureView } from "../views/infrastructure";
import { inputCls, btnPrimary, btnSecondary } from "../shared";

export default function FirewallPage() {
  const { selectedHostId } = useDashboard();
  return (
    <InfrastructureView
      hostId={selectedHostId}
      initialTab="firewall"
      inputCls={inputCls}
      btnPrimary={btnPrimary}
      btnSecondary={btnSecondary}
    />
  );
}
