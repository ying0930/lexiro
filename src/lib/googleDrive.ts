import { MAX_BACKUP_FILES } from '@/constants'

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const WORDMEM_FOLDER_NAME = 'Wordmem'

let gisScriptPromise: Promise<void> | null = null
let tokenClient: any = null
let accessToken = localStorage.getItem('wordmem_drive_access_token') || ''
let tokenExpiresAt = Number(localStorage.getItem('wordmem_drive_token_expires_at') || '0')

function loadGoogleIdentityServices(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2)
    return Promise.resolve()
  if (gisScriptPromise)
    return gisScriptPromise

  gisScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Google 登入服務載入失敗')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google 登入服務載入失敗'))
    document.head.appendChild(script)
  })

  return gisScriptPromise
}

function ensureClientId(clientId: string): void {
  if (!clientId) {
    throw new Error('尚未設定 VITE_GOOGLE_CLIENT_ID，無法使用 Google Drive 備份。')
  }
}

async function getTokenClient(clientId: string): Promise<any> {
  ensureClientId(clientId)
  if (tokenClient)
    return tokenClient

  await loadGoogleIdentityServices()
  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: () => {},
    error_callback: () => {},
  })
  return tokenClient
}

export function hasDriveToken(): boolean {
  return Boolean(accessToken) && Date.now() < tokenExpiresAt
}

function isTokenExpiringSoon(thresholdMs = 5 * 60 * 1000): boolean {
  return Boolean(accessToken) && tokenExpiresAt - Date.now() < thresholdMs
}

async function silentRefreshToken(clientId: string): Promise<void> {
  if (!accessToken || !isTokenExpiringSoon())
    return
  try {
    await requestDriveAccess(clientId, '')
  }
  catch {
    // Silent refresh failed, will be handled by the caller
  }
}

export async function requestDriveAccess(clientId: string, prompt = ''): Promise<{ accessToken: string, expiresAt: number }> {
  ensureClientId(clientId)

  if (hasDriveToken()) {
    return {
      accessToken,
      expiresAt: tokenExpiresAt,
    }
  }

  const client = await getTokenClient(clientId)

  return new Promise((resolve, reject) => {
    client.callback = (response: any) => {
      if (response.error) {
        reject(new Error(response.error_description || 'Google 授權失敗'))
        return
      }
      accessToken = response.access_token
      tokenExpiresAt = Date.now() + Math.max(Number(response.expires_in ?? 0) - 60, 0) * 1000
      localStorage.setItem('wordmem_drive_access_token', accessToken)
      localStorage.setItem('wordmem_drive_token_expires_at', String(tokenExpiresAt))
      resolve({
        accessToken,
        expiresAt: tokenExpiresAt,
      })
    }
    client.error_callback = () => reject(new Error('Google 登入已取消或失敗'))
    client.requestAccessToken({ prompt })
  })
}

export function revokeDriveAccess(): void {
  localStorage.removeItem('wordmem_drive_access_token')
  localStorage.removeItem('wordmem_drive_token_expires_at')
  if (!accessToken || !(window as any).google?.accounts?.oauth2?.revoke) {
    accessToken = ''
    tokenExpiresAt = 0
    return
  }

  (window as any).google.accounts.oauth2.revoke(accessToken, () => {
    accessToken = ''
    tokenExpiresAt = 0
  })
}

async function driveFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
  if (clientId)
    await silentRefreshToken(clientId)

  if (!hasDriveToken()) {
    throw new Error('Google Drive 授權已過期，請重新登入。')
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers as Record<string, string> ?? {}),
    },
  })

  if (!response.ok) {
    let message = 'Google Drive 操作失敗'
    try {
      const data = await response.json()
      message = data?.error?.message || message
    }
    catch {
      message = response.statusText || message
    }
    throw new Error(message)
  }

  return response
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')
}

export async function ensureWordmemFolder(): Promise<{ id: string, name: string }> {
  const folderName = escapeDriveQueryValue(WORDMEM_FOLDER_NAME)
  const params = new URLSearchParams({
    q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id,name)',
    spaces: 'drive',
  })

  const listResponse = await driveFetch(`${DRIVE_API_BASE}/files?${params.toString()}`)
  const listData = await listResponse.json()
  if (listData.files?.length)
    return listData.files[0]

  const createResponse = await driveFetch(`${DRIVE_API_BASE}/files?fields=id,name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: WORDMEM_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })

  return createResponse.json()
}

export async function uploadBackupZip(blob: Blob, filename: string): Promise<any> {
  const folder = await ensureWordmemFolder()
  const boundary = `wordmem-${Date.now()}`
  const metadata = {
    name: filename,
    mimeType: 'application/zip',
    parents: [folder.id],
  }

  const body = new Blob(
    [
      `--${boundary}\r\n`,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\n`,
      'Content-Type: application/zip\r\n\r\n',
      blob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  )

  const response = await driveFetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,createdTime`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })

  return response.json()
}

export async function listBackupFiles(): Promise<{ id: string, name: string, size: string, createdTime: string, modifiedTime: string }[]> {
  const folder = await ensureWordmemFolder()
  const folderId = escapeDriveQueryValue(folder.id)
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType = 'application/zip' and trashed = false`,
    fields: 'files(id,name,size,createdTime,modifiedTime)',
    orderBy: 'createdTime desc',
    spaces: 'drive',
  })

  const response = await driveFetch(`${DRIVE_API_BASE}/files?${params.toString()}`)
  const data = await response.json()
  return (data.files ?? []).filter((file: any) => /^wordmem-backup-\d{8}-\d{4}\.zip$/i.test(file.name))
}

export async function deleteBackupFile(fileId: string): Promise<void> {
  await driveFetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  })
}

export async function pruneOldBackupFiles(maxFiles = MAX_BACKUP_FILES): Promise<{ kept: any[], deleted: any[] }> {
  const files = await listBackupFiles()
  const oldFiles = files.slice(maxFiles)
  await Promise.all(oldFiles.map(file => deleteBackupFile(file.id)))
  return {
    kept: files.slice(0, maxFiles),
    deleted: oldFiles,
  }
}

export async function downloadBackupFile(fileId: string): Promise<ArrayBuffer> {
  const response = await driveFetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`)
  return response.arrayBuffer()
}
