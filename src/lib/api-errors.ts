import { NextResponse } from "next/server";

export function serverErrorJson(args: {
  error: unknown;
  fallbackMessage: string;
  route: string;
  status?: number;
}) {
  console.error(`[${args.route}]`, args.error);
  return NextResponse.json(
    {
      error: args.fallbackMessage,
    },
    {
      status: args.status ?? 500,
    },
  );
}
