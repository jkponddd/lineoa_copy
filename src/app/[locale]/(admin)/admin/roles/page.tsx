import { useTranslations } from "next-intl";
import { Check, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CAPABILITIES = [
  { key: "capInbox", owner: true, agent: true, analyst: true },
  { key: "capBroadcast", owner: true, agent: true, analyst: true },
  { key: "capRichMenu", owner: true, agent: true, analyst: true },
  { key: "capReports", owner: true, agent: true, analyst: true },
  { key: "capAdminPanel", owner: true, agent: false, analyst: false },
] as const;

export default function RolesPage() {
  const t = useTranslations("roles");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <RoleCard role="owner" title={t("roleOwner")} description={t("roleOwnerDescription")} />
        <RoleCard role="agent" title={t("roleAgent")} description={t("roleAgentDescription")} />
        <RoleCard role="analyst" title={t("roleAnalyst")} description={t("roleAnalystDescription")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("capabilitiesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{t("capabilityColumn")}</th>
                  <th className="px-2 py-2 text-center font-medium">{t("roleOwner")}</th>
                  <th className="px-2 py-2 text-center font-medium">{t("roleAgent")}</th>
                  <th className="px-2 py-2 text-center font-medium">{t("roleAnalyst")}</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((row) => (
                  <tr key={row.key} className="border-b last:border-0">
                    <td className="py-2 pr-4">{t(row.key)}</td>
                    <td className="px-2 py-2 text-center">
                      <CapabilityMark granted={row.owner} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <CapabilityMark granted={row.agent} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <CapabilityMark granted={row.analyst} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("agentAnalystNote")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleCard({ role, title, description }: { role: "owner" | "agent" | "analyst"; title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {role === "owner" ? <Badge variant="outline">{role}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function CapabilityMark({ granted }: { granted: boolean }) {
  return granted ? (
    <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <Minus className="mx-auto size-4 text-muted-foreground" />
  );
}
