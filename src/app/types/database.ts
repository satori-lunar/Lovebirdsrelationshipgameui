export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
          trial_start_date: string | null;
          trial_end_date: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          created_at?: string;
          trial_start_date?: string | null;
          trial_end_date?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          trial_start_date?: string | null;
          trial_end_date?: string | null;
        };
      };
      relationships: {
        Row: {
          id: string;
          partner_a_id: string;
          partner_b_id: string | null;
          invite_code: string;
          invite_code_expires_at: string;
          created_at: string;
          connected_at: string | null;
          relationship_start_date: string | null;
        };
        Insert: {
          id?: string;
          partner_a_id: string;
          partner_b_id?: string | null;
          invite_code: string;
          invite_code_expires_at: string;
          created_at?: string;
          connected_at?: string | null;
          relationship_start_date?: string | null;
        };
        Update: {
          id?: string;
          partner_a_id?: string;
          partner_b_id?: string | null;
          invite_code?: string;
          invite_code_expires_at?: string;
          connected_at?: string | null;
          relationship_start_date?: string | null;
        };
      };
      onboarding_responses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          partner_name: string;
          living_together: string | null;
          relationship_duration: string | null;
          love_languages: string[];
          favorite_activities: string[];
          budget_comfort: string | null;
          energy_level: string | null;
          feel_loved: string | null;
          wish_happened: string | null;
          communication_style: string | null;
          fears_triggers: string | null;
          health_accessibility: string | null;
          relationship_goals: string | null;
          is_private: boolean;
          created_at: string;
          updated_at: string;
          user_photo_url: string | null;
          partner_photo_url: string | null;
          relationship_status: string | null;
          date_frequency: string | null;
          want_more_dates: boolean | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          partner_name: string;
          living_together?: string | null;
          relationship_duration?: string | null;
          love_languages?: string[];
          favorite_activities?: string[];
          budget_comfort?: string | null;
          energy_level?: string | null;
          feel_loved?: string | null;
          wish_happened?: string | null;
          communication_style?: string | null;
          fears_triggers?: string | null;
          health_accessibility?: string | null;
          relationship_goals?: string | null;
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
          user_photo_url?: string | null;
          partner_photo_url?: string | null;
          relationship_status?: string | null;
          date_frequency?: string | null;
          want_more_dates?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          partner_name?: string;
          living_together?: string | null;
          relationship_duration?: string | null;
          love_languages?: string[];
          favorite_activities?: string[];
          budget_comfort?: string | null;
          energy_level?: string | null;
          feel_loved?: string | null;
          wish_happened?: string | null;
          communication_style?: string | null;
          fears_triggers?: string | null;
          health_accessibility?: string | null;
          relationship_goals?: string | null;
          is_private?: boolean;
          updated_at?: string;
          user_photo_url?: string | null;
          partner_photo_url?: string | null;
          relationship_status?: string | null;
          date_frequency?: string | null;
          want_more_dates?: boolean | null;
        };
      };
      daily_questions: {
        Row: {
          id: string;
          question_text: string;
          question_date: string;
          relationship_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_text: string;
          question_date: string;
          relationship_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_text?: string;
          question_date?: string;
          relationship_id?: string;
        };
      };
      question_answers: {
        Row: {
          id: string;
          question_id: string;
          user_id: string;
          answer_text: string;
          answered_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          user_id: string;
          answer_text: string;
          answered_at?: string;
        };
        Update: {
          id?: string;
          answer_text?: string;
        };
      };
      question_guesses: {
        Row: {
          id: string;
          question_id: string;
          user_id: string;
          guess_text: string;
          guessed_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          user_id: string;
          guess_text: string;
          guessed_at?: string;
        };
        Update: {
          id?: string;
          guess_text?: string;
        };
      };
      love_language_suggestions: {
        Row: {
          id: string;
          user_id: string;
          suggestion_text: string;
          suggestion_type: string;
          time_estimate: string;
          difficulty: string;
          week_start_date: string;
          saved: boolean;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          suggestion_text: string;
          suggestion_type: string;
          time_estimate: string;
          difficulty: string;
          week_start_date: string;
          saved?: boolean;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          saved?: boolean;
          completed?: boolean;
        };
      };
      date_ideas: {
        Row: {
          id: string;
          relationship_id: string;
          user_id: string | null;
          title: string;
          description: string;
          category: string;
          duration: string;
          budget: string;
          location: string;
          image_emoji: string;
          scheduled_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          relationship_id: string;
          user_id?: string | null;
          title: string;
          description: string;
          category: string;
          duration: string;
          budget: string;
          location: string;
          image_emoji: string;
          scheduled_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          scheduled_date?: string | null;
        };
      };
      date_matches: {
        Row: {
          id: string;
          date_idea_id: string;
          relationship_id: string;
          partner_a_liked: boolean;
          partner_b_liked: boolean;
          is_match: boolean;
          is_selected: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          date_idea_id: string;
          relationship_id: string;
          partner_a_liked: boolean;
          partner_b_liked: boolean;
          is_match?: boolean;
          is_selected?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          partner_a_liked?: boolean;
          partner_b_liked?: boolean;
          is_match?: boolean;
          is_selected?: boolean;
        };
      };
      important_dates: {
        Row: {
          id: string;
          relationship_id: string;
          user_id: string | null;
          title: string;
          date: string;
          type: 'anniversary' | 'birthday' | 'custom';
          recurring: boolean;
          reminder_sent_1week: boolean;
          reminder_sent_3days: boolean;
          reminder_sent_dayof: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          relationship_id: string;
          user_id?: string | null;
          title: string;
          date: string;
          type: 'anniversary' | 'birthday' | 'custom';
          recurring?: boolean;
          reminder_sent_1week?: boolean;
          reminder_sent_3days?: boolean;
          reminder_sent_dayof?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          date?: string;
          type?: 'anniversary' | 'birthday' | 'custom';
          recurring?: boolean;
          reminder_sent_1week?: boolean;
          reminder_sent_3days?: boolean;
          reminder_sent_dayof?: boolean;
        };
      };
      memories: {
        Row: {
          id: string;
          relationship_id: string;
          user_id: string;
          title: string;
          photo_url: string | null;
          journal_entry: string | null;
          tags: string[];
          category: 'date_night' | 'milestone' | 'trip' | 'everyday_moment' | 'growth_moment' | 'celebration' | 'other' | null;
          is_private: boolean;
          memory_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          relationship_id: string;
          user_id: string;
          title: string;
          photo_url?: string | null;
          journal_entry?: string | null;
          tags?: string[];
          category?: 'date_night' | 'milestone' | 'trip' | 'everyday_moment' | 'growth_moment' | 'celebration' | 'other' | null;
          is_private?: boolean;
          memory_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          photo_url?: string | null;
          journal_entry?: string | null;
          tags?: string[];
          category?: 'date_night' | 'milestone' | 'trip' | 'everyday_moment' | 'growth_moment' | 'celebration' | 'other' | null;
          is_private?: boolean;
          memory_date?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_type: 'premium';
          status: 'active' | 'cancelled' | 'expired';
          start_date: string;
          end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_type: 'premium';
          status?: 'active' | 'cancelled' | 'expired';
          start_date: string;
          end_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          status?: 'active' | 'cancelled' | 'expired';
          end_date?: string | null;
        };
      };
    };
  };
}

