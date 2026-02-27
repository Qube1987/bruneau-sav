import { useState } from 'react';
import { Plus, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useCallNotes, CallNote } from '../../hooks/useCallNotes';
import { CallNoteCard } from './CallNoteCard';
import { CallNoteForm } from './CallNoteForm';

export function CallNotes() {
  const { callNotes, loading, createCallNote, updateCallNote, deleteCallNote, toggleCompleted } =
    useCallNotes();
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<CallNote | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  const activeNotes = callNotes.filter((n) => !n.is_completed);
  const completedNotes = callNotes.filter((n) => n.is_completed);
  const urgentNotes = activeNotes.filter((n) => n.priority === 'urgent' || n.priority === 'high');

  const displayedNotes =
    filter === 'all' ? callNotes : filter === 'active' ? activeNotes : completedNotes;

  const handleSubmit = async (data: any) => {
    try {
      if (editingNote) {
        await updateCallNote(editingNote.id, data);
        setEditingNote(null);
      } else {
        await createCallNote(data);
      }
      setShowForm(false);
    } catch (error) {
      console.error('Failed to save call note:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement de la note');
    }
  };

  const handleEdit = (note: CallNote) => {
    setEditingNote(note);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingNote(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-4">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Appels & Rappels</h1>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nouvelle note</span>
            </button>
          </div>

          {urgentNotes.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-red-900">
                  {urgentNotes.length} appel{urgentNotes.length > 1 ? 's' : ''} prioritaire
                  {urgentNotes.length > 1 ? 's' : ''}
                </span>
                <span className="text-red-700"> en attente</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
            <button
              onClick={() => setFilter('active')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'active'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Circle className="w-4 h-4" />
              À faire ({activeNotes.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Terminées ({completedNotes.length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes ({callNotes.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {displayedNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              {filter === 'completed' ? (
                <CheckCircle2 className="w-8 h-8 text-gray-400" />
              ) : (
                <Circle className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {filter === 'completed' ? 'Aucune note terminée' : 'Aucune note'}
            </h3>
            <p className="text-gray-600">
              {filter === 'completed'
                ? 'Les notes terminées apparaîtront ici'
                : 'Cliquez sur le bouton "+" pour ajouter votre première note'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {displayedNotes.map((note) => (
              <CallNoteCard
                key={note.id}
                note={note}
                onToggleComplete={toggleCompleted}
                onDelete={deleteCallNote}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <CallNoteForm onSubmit={handleSubmit} onCancel={handleCancel} editingNote={editingNote} />
      )}
    </div>
  );
}
