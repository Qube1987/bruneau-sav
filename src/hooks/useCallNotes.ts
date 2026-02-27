import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface CallNote {
  id: string;
  client_name: string | null;
  client_phone: string | null;
  sav_request_id: string | null;
  maintenance_contract_id: string | null;
  call_subject: string | null;
  notes: string | null;
  is_completed: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCallNoteData {
  client_name?: string;
  client_phone?: string;
  sav_request_id?: string;
  maintenance_contract_id?: string;
  call_subject?: string;
  notes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface UpdateCallNoteData {
  client_name?: string;
  client_phone?: string;
  call_subject?: string;
  notes?: string;
  is_completed?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export function useCallNotes() {
  const [callNotes, setCallNotes] = useState<CallNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCallNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('call_notes')
        .select('*')
        .order('is_completed', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCallNotes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch call notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallNotes();

    const channel = supabase
      .channel('call_notes_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'call_notes' },
        () => {
          fetchCallNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createCallNote = async (data: CreateCallNoteData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data: newNote, error } = await supabase
        .from('call_notes')
        .insert([
          {
            ...data,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      await fetchCallNotes();
      return newNote;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create call note');
    }
  };

  const updateCallNote = async (id: string, data: UpdateCallNoteData) => {
    try {
      const { data: updatedNote, error } = await supabase
        .from('call_notes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchCallNotes();
      return updatedNote;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update call note');
    }
  };

  const deleteCallNote = async (id: string) => {
    try {
      const { error } = await supabase.from('call_notes').delete().eq('id', id);

      if (error) throw error;
      await fetchCallNotes();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete call note');
    }
  };

  const toggleCompleted = async (id: string, isCompleted: boolean) => {
    return updateCallNote(id, { is_completed: isCompleted });
  };

  return {
    callNotes,
    loading,
    error,
    createCallNote,
    updateCallNote,
    deleteCallNote,
    toggleCompleted,
    refetch: fetchCallNotes,
  };
}
