import { Check, Trash2, Phone, Edit2, X } from 'lucide-react';
import { CallNote } from '../../hooks/useCallNotes';
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CallNoteCardProps {
  note: CallNote;
  onToggleComplete: (id: string, isCompleted: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (note: CallNote) => void;
}

const priorityColors = {
  low: 'bg-white border-gray-200',
  normal: 'bg-white border-gray-200',
  high: 'bg-yellow-50 border-yellow-200',
  urgent: 'bg-red-50 border-red-200',
};

const priorityLabels = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
};

export function CallNoteCard({ note, onToggleComplete, onDelete, onEdit }: CallNoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggleComplete(note.id, !note.is_completed);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette note ?')) return;
    setIsDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`relative p-4 rounded-lg border-2 shadow-sm transition-all ${note.is_completed
          ? 'bg-gray-100 border-gray-300 opacity-60'
          : priorityColors[note.priority]
        }`}
    >
      {note.is_completed && (
        <div className="absolute inset-0 bg-gray-900/5 rounded-lg pointer-events-none" />
      )}

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {note.client_name && (
              <h3
                className={`font-semibold text-lg ${note.is_completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
              >
                {note.client_name}
              </h3>
            )}
            {note.client_phone && (
              <a
                href={`tel:${note.client_phone}`}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1"
              >
                <Phone className="w-4 h-4" />
                <span>{note.client_phone}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!note.is_completed && (
              <button
                onClick={() => onEdit(note)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-white/50 transition-colors"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-white/50 transition-colors text-red-600"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {note.call_subject && (
          <div className={note.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}>
            <p className="font-medium text-sm">Objet:</p>
            <p className="text-sm mt-0.5">{note.call_subject}</p>
          </div>
        )}

        {note.notes && (
          <div className={note.is_completed ? 'line-through text-gray-500' : 'text-gray-600'}>
            <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-current/10">
          <span className="text-xs text-gray-500">
            {format(new Date(note.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
          </span>
          {note.priority !== 'normal' && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${note.priority === 'urgent'
                  ? 'bg-red-100 text-red-700'
                  : note.priority === 'high'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
            >
              {priorityLabels[note.priority]}
            </span>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`p-4 rounded-lg transition-all shadow-sm ${note.is_completed
                ? 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            title={note.is_completed ? 'Marquer comme à faire' : 'Marquer comme terminé'}
          >
            {note.is_completed ? <X className="w-8 h-8" /> : <Check className="w-8 h-8" />}
          </button>
        </div>
      </div>
    </div>
  );
}
