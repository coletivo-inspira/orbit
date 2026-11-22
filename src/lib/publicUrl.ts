/** Base path the static export is served from ("/orbit" on GitHub Pages, "" on a root domain). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Path of a public route, matching the export's `trailingSlash: true`. */
export function publicPath(route: string, basePath: string = BASE_PATH): string {
  const clean = `/${route.replace(/^\/+|\/+$/g, "")}`;
  return `${basePath.replace(/\/+$/, "")}${clean === "/" ? "" : clean}/`;
}

/** Absolute URL that opens the same public route in a clean tab. */
export function publicUrl(
  route: string,
  origin: string = window.location.origin,
  basePath: string = BASE_PATH,
): string {
  return `${origin.replace(/\/+$/, "")}${publicPath(route, basePath)}`;
}

export const articleRoute = (id: string) => `/comunidade/${id}`;

/** Static asset under `public/profiles/`, prefixed with the base path like every exported URL. */
export function profilePhotoUrl(photo: string, basePath: string = BASE_PATH): string {
  return `${basePath.replace(/\/+$/, "")}/profiles/${photo}`;
}
