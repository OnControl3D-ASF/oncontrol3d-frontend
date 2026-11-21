export function mergeSession<T extends object>(me: T, login: { token?: string }): T & { token: string }
export function isSessionExpired(status: number, endpoint: string): boolean
