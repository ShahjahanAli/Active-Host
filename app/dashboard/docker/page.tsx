"use client";

import { useDashboard } from "../dashboard-context";
import { DockerView } from "../views/docker";
import { inputCls, btnPrimary, btnSecondary } from "../shared";

export default function DockerPage() {
  const { selectedHostId } = useDashboard();
  return (
    <DockerView
      hostId={selectedHostId}
      inputCls={inputCls}
      btnPrimary={btnPrimary}
      btnSecondary={btnSecondary}
    />
  );
}
