import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth-session";
import { getDashboardDataByEmail } from "@/lib/dashboard-data";
import { parseConnectionKey } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getDashboardDataByEmail(user.email);

  return NextResponse.json(dashboard?.user ?? null);
}

export async function PUT(request: Request) {
  const user = await requireAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      action?: "add_connection" | "remove_connection";
      connectionKey?: string;
    };
    const action = payload.action;
    const connectionKey = parseConnectionKey(payload.connectionKey);

    if (action !== "add_connection" && action !== "remove_connection") {
      throw new Error("Profile action is invalid.");
    }

    const nextConnections = new Set(user.connections ?? []);

    if (action === "add_connection") {
      nextConnections.add(connectionKey);
    } else {
      nextConnections.delete(connectionKey);
    }

    user.connections = [...nextConnections].sort();
    await user.save();

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        connections: user.connections,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update profile.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
