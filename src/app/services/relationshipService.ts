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

    // IMPORTANT: Delete any orphaned relationship where this user is partner_a
    // This handles the case where User B created their own invite before entering User A's code
    console.log('🗑️ Checking for orphaned relationships...');
    const { data: orphanedRelationship } = await api.supabase
      .from('relationships')
      .select('*')
      .eq('partner_a_id', partnerBId)
      .is('partner_b_id', null)
      .maybeSingle();

    if (orphanedRelationship) {
      console.log('🗑️ Found orphaned relationship:', orphanedRelationship.id);
      const { error: deleteError } = await api.supabase
        .from('relationships')
        .delete()
        .eq('id', orphanedRelationship.id);

      if (deleteError) {
        console.error('❌ Failed to delete orphaned relationship:', deleteError);
        throw new Error(
          'Failed to delete your previous invite. Please run migration 024 to enable relationship deletion. ' +
          'See supabase/migrations/024_add_relationship_delete_policy.sql'
        );
      }
      console.log('✅ Successfully deleted orphaned relationship');
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
    try {
      console.log('🔍 Fetching relationship for user:', userId);
      const { data: relationship, error } = await api.supabase
        .from('relationships')
        .select('*')
        .or(`partner_a_id.eq.${userId},partner_b_id.eq.${userId}`)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors

      if (error) {
        console.error('❌ Error fetching relationship:', error);
        // Return null instead of throwing - user just doesn't have a relationship yet
        return null;
      }

      console.log('✅ Relationship fetched:', {
        id: relationship?.id,
        partner_a_id: relationship?.partner_a_id,
        partner_b_id: relationship?.partner_b_id,
        invite_code: relationship?.invite_code,
        connected: !!relationship?.partner_b_id
      });

      return relationship;
    } catch (error) {
      console.error('❌ Unexpected error in getRelationship:', error);
      return null;
    }
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

  async disconnectPartner(userId: string): Promise<void> {
    console.log('💔 Attempting to disconnect partner for user:', userId);

    // Get the user's relationship
    const relationship = await this.getRelationship(userId);

    if (!relationship) {
      console.error('❌ No relationship found');
      throw new Error('No relationship found');
    }

    if (!relationship.partner_b_id) {
      console.error('❌ Not connected to a partner');
      throw new Error('Not connected to a partner');
    }

    console.log('🗑️ Deleting relationship:', relationship.id);

    // Delete the entire relationship - clean break
    // Both users will need to create new invites to reconnect
    const { error } = await api.supabase
      .from('relationships')
      .delete()
      .eq('id', relationship.id);

    if (error) {
      console.error('❌ Failed to delete relationship:', error);
      throw new Error('Failed to disconnect. Please try again.');
    }

    console.log('✅ Successfully disconnected from partner');
  },

  async updateRelationshipStartDate(userId: string, startDate: string): Promise<Relationship> {
    console.log('📅 Updating relationship start date for user:', userId);

    // Get the user's relationship
    const relationship = await this.getRelationship(userId);

    if (!relationship) {
      console.error('❌ No relationship found');
      throw new Error('No relationship found');
    }

    console.log('📅 Updating relationship:', relationship.id, 'with start date:', startDate);

    const updated = await handleSupabaseError(
      api.supabase
        .from('relationships')
        .update({
          relationship_start_date: startDate,
        })
        .eq('id', relationship.id)
        .select()
        .single()
    );

    console.log('✅ Successfully updated relationship start date');
    return updated;
  },
};

