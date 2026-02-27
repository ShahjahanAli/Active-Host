"use client";

import { useDashboard } from "../dashboard-context";
import { AppsView } from "../views/apps";
import { inputCls, btnPrimary, btnSecondary } from "../shared";

export default function AppsPage() {
  const { selectedHostId } = useDashboard();
  return (
    <AppsView
      hostId={selectedHostId}
      inputCls={inputCls}
      btnPrimary={btnPrimary}
      btnSecondary={btnSecondary}
    />
  );
}
