"use client";

import { NotificationsView } from "../views/notifications";
import { inputCls, btnPrimary, btnSecondary } from "../shared";

export default function NotificationsPage() {
  return (
    <NotificationsView
      inputCls={inputCls}
      btnPrimary={btnPrimary}
      btnSecondary={btnSecondary}
    />
  );
}
