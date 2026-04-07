import { supabase } from './supabase'

const BUCKET = 'card-photos'

export async function uploadPhoto(itemId: string, file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${session.user.id}/${itemId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
  })
  if (error) throw error
  return path
}

export function getPhotoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function deletePhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}
