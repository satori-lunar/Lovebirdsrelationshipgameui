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
    console.log('getRelationshipByInviteCode called with:', inviteCode);

    const relationship = await handleSupabaseError(
      api.supabase
        .from('relationships')
        .select('*')
        .eq('invite_code', inviteCode)
        .single()
    );

    console.log('Relationship query result:', relationship);

    if (!relationship) {
      console.log('No relationship found for invite code');
      return null;
    }

    // Check if code is expired
    const expiresAt = new Date(relationship.invite_code_expires_at);
    console.log('Invite code expires at:', expiresAt, 'Current time:', new Date());
    if (expiresAt < new Date()) {
      console.log('Invite code has expired');
      throw new Error('Invite code has expired');
    }

    // Check if already connected
    if (relationship.partner_b_id) {
      console.log('Invite code already used by partner:', relationship.partner_b_id);
      throw new Error('This invite code has already been used');
    }

    console.log('Invite code is valid');
    return relationship;
  },

  async connectPartner(inviteCode: string, partnerBId: string): Promise<Relationship> {
    console.log('connectPartner called with:', { inviteCode, partnerBId });

    const relationship = await this.getRelationshipByInviteCode(inviteCode);
    console.log('Found relationship:', relationship);

    if (!relationship) {
      throw new Error('Invalid invite code');
    }

    if (relationship.partner_a_id === partnerBId) {
      throw new Error('Cannot connect to yourself');
    }

    console.log('Updating relationship with partner_b_id...');
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

    console.log('Partner connection completed:', updated);
    return updated;
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

