import { api, handleSupabaseError } from './api';
import type { Tables, Inserts, Updates } from './api';

export type Memory = Tables<'memories'>;

export const memoryService = {
  async uploadPhoto(file: File, userId: string, relationshipId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `memories/${fileName}`;

    const { error: uploadError } = await api.supabase.storage
      .from('memories')
      .upload(filePath, file);

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = api.supabase.storage
      .from('memories')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async createMemory(
    relationshipId: string,
    userId: string,
    data: {
      photoUrl?: string;
      journalEntry?: string;
      tags?: string[];
      isPrivate?: boolean;
      memoryDate: string;
    }
  ): Promise<Memory> {
    const newMemory: Inserts<'memories'> = {
      relationship_id: relationshipId,
      user_id: userId,
      photo_url: data.photoUrl || null,
      journal_entry: data.journalEntry || null,
      tags: data.tags || [],
      is_private: data.isPrivate ?? false,
      memory_date: data.memoryDate,
    };

    const created = await handleSupabaseError(
      api.supabase
        .from('memories')
        .insert(newMemory)
        .select()
        .single()
    );

    return created;
  },

  async getMemories(relationshipId: string, userId?: string): Promise<Memory[]> {
    let query = api.supabase
      .from('memories')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('memory_date', { ascending: false });

    // If userId provided, filter private memories
    if (userId) {
      query = query.or(`is_private.eq.false,user_id.eq.${userId}`);
    } else {
      query = query.eq('is_private', false);
    }

    const memories = await handleSupabaseError(query);
    return memories || [];
  },

  async updateMemory(
    memoryId: string,
    updates: Partial<Updates<'memories'>>
  ): Promise<Memory> {
    const updated = await handleSupabaseError(
      api.supabase
        .from('memories')
        .update(updates)
        .eq('id', memoryId)
        .select()
        .single()
    );

    return updated;
  },

  async deleteMemory(memoryId: string): Promise<void> {
    await handleSupabaseError(
      api.supabase
        .from('memories')
        .delete()
        .eq('id', memoryId)
    );
  },
};

