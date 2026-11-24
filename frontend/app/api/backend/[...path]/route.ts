import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backendOrigin(request: NextRequest): string {
  const configured = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/$/, "");

  // A URL that points at this Next app has no /tutor routes and returns 404.
  if (configured === request.nextUrl.origin) {
    return "http://127.0.0.1:8000";
  }
  return configured;
}

async function proxy(request: NextRequest, path: string[]) {
  const target = `${backendOrigin(request)}/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // @ts-expect-error Node fetch requires duplex when forwarding a stream body
    duplex: hasBody ? "half" : undefined,
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  try {
    return await proxy(request, path);
  } catch {
    return Response.json(
      { detail: "Tutor API is unreachable. Check that the backend is running and NEXT_PUBLIC_API_URL points at it." },
      { status: 502 }
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
