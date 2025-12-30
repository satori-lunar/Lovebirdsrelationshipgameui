import { api, handleSupabaseError } from './api';
import type { Inserts, Tables } from './api';

export type Relationship = Tables<'relationships'>;

export const relationshipService = {
  async createRelationship(userId: string): Promise<Relationship> {
    // Generate invite code
    const inviteCode = await this.generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const relationship = await handleSupabaseError(
      api.supabase
        .from('relationships')
        .insert({
          partner_a_id: userId,
          invite_code: inviteCode,
          invite_code_expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()
    );

    return relationship;
  },

  async generateInviteCode(): Promise<string> {
    // Generate a random 8-character code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  async getRelationshipByInviteCode(inviteCode: string): Promise<Relationship | null> {
    const relationship = await handleSupabaseError(
      api.supabase
        .from('relationships')
        .select('*')
        .eq('invite_code', inviteCode)
        .single()
    );

    if (!relationship) return null;

    // Check if code is expired
    const expiresAt = new Date(relationship.invite_code_expires_at);
    if (expiresAt < new Date()) {
      throw new Error('Invite code has expired');
    }

    // Check if already connected
    if (relationship.partner_b_id) {
      throw new Error('This invite code has already been used');
    }

    return relationship;
  },

  async connectPartner(inviteCode: string, partnerBId: string): Promise<Relationship> {
    console.log('🔗 Attempting to connect partner with invite code:', inviteCode);

    const relationship = await this.getRelationshipByInviteCode(inviteCode);

    if (!relationship) {
      console.error('❌ Invalid invite code:', inviteCode);
      throw new Error('Invalid invite code');
    }

    console.log('✓ Found relationship:', {
      id: relationship.id,
      partner_a_id: relationship.partner_a_id,
      partner_b_id: relationship.partner_b_id,
      connecting_as: partnerBId
    });

    if (relationship.partner_a_id === partnerBId) {
      console.error('❌ User trying to connect to themselves');
      throw new Error('Cannot connect to yourself');
    }

    console.log('🔄 Updating relationship to connect partner_b...');

    try {
      const updated = await handleSupabaseError(
        api.supabase
          .from('relationships')
          .update({
            partner_b_id: partnerBId,
            connected_at: new Date().toISOString(),
          })
          .eq('id', relationship.id)
          .select()
          .single()
      );

      console.log('✅ Successfully connected partner!', {
        relationship_id: updated.id,
        partner_a_id: updated.partner_a_id,
        partner_b_id: updated.partner_b_id,
        connected_at: updated.connected_at
      });

      return updated;
    } catch (error: any) {
      console.error('❌ Failed to update relationship:', error);

      // Provide more helpful error messages
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error(
          'Permission denied. Please ensure the relationship UPDATE policy allows partner connections. ' +
          'See SUPABASE_SETUP.md for migration instructions.'
        );
      }

      throw error;
    }
  },

  async getRelationship(userId: string): Promise<Relationship | null> {
    const relationship = await handleSupabaseError(
      api.supabase
        .from('relationships')
        .select('*')
        .or(`partner_a_id.eq.${userId},partner_b_id.eq.${userId}`)
        .single()
    );

    return relationship;
  },

  async getPartnerId(userId: string, relationshipId: string): Promise<string | null> {
    const relationship = await handleSupabaseError(
      api.supabase
        .from('relationships')
        .select('partner_a_id, partner_b_id')
        .eq('id', relationshipId)
        .single()
    );

    if (!relationship) return null;

    if (relationship.partner_a_id === userId) {
      return relationship.partner_b_id;
    }
    return relationship.partner_a_id;
  },
};

