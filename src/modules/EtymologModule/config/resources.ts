import definitions from "./resources.json";
export interface ResourceDefinition {
  required: string[];
  fields: Record<string, [string, string | number | null]>;
  system?: string[];
  references?: Record<string, string>;
  admin?: boolean;
}
export const resources = definitions as unknown as Record<
  string,
  ResourceDefinition
>;
export const resourceKeys = Object.keys(resources);
export function resourceDefinition(key: string) {
  return Object.hasOwn(resources, key) ? resources[key] : undefined;
}
