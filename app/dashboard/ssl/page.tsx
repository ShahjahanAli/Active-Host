"use client";

import { useDashboard } from "../dashboard-context";
import { InfrastructureView } from "../views/infrastructure";
import { inputCls, btnPrimary, btnSecondary } from "../shared";

export default function SslPage() {
  const { selectedHostId } = useDashboard();
  return (
    <InfrastructureView
      hostId={selectedHostId}
      initialTab="ssl"
      inputCls={inputCls}
      btnPrimary={btnPrimary}
      btnSecondary={btnSecondary}
    />
  );
}
