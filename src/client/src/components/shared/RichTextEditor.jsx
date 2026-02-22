// components/shared/RichTextEditor.jsx - Éditeur rich text TipTap (Notion-like, v3)
import React, {useEffect, useCallback, useState} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

import './RichTextEditor.css';
import AlertModal from "./AlertModal.jsx";

// --- Bouton toolbar ---
const ToolbarButton = ({ onClick, active, title, children }) => (
    <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className={`px-1.5 py-1 rounded text-xs font-semibold transition-colors ${
            active
                ? 'bg-viking-bronze text-viking-brown'
                : 'text-viking-leather dark:text-viking-bronze hover:bg-viking-bronze/20'
        }`}
        title={title}
    >
        {children}
    </button>
);

// --- Séparateur ---
const Separator = () => (
    <div className="w-px h-5 bg-viking-leather/20 dark:bg-viking-bronze/30 mx-0.5" />
);

const RichTextEditor = ({
                            content = '',
                            onUpdate,
                            onBlur,
                            editable = true,
                            placeholder = 'Écrivez ici...',
                            maxImageSize = 20 * 1024 * 1024,
                            className = '',
                        }) => {
    const [alertMessage, setAlertMessage] = useState(null);
    // Convertir du texte brut en HTML basique (rétrocompatibilité)
    const normalizeContent = (raw) => {
        if (!raw) return '';
        if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
        return raw.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
    };


    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Underline,
            Highlight.configure({
                multicolor: false,
            }),
            Image.configure({
                inline: true,
                allowBase64: true,
                resize: {
                    enabled: true,
                    minWidth: 50,
                    minHeight: 50,
                    directions: ['top', 'bottom', 'left', 'right'],
                    alwaysPreserveAspectRatio: true,
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content: normalizeContent(content),
        editable,
        onUpdate: ({ editor }) => {
            if (onUpdate) onUpdate(editor.getHTML());
        },
        onBlur: () => {
            if (onBlur) onBlur();
        },
        editorProps: {
            handleDrop: (view, event) => {
                if (!editable) return false;
                const files = event.dataTransfer?.files;
                if (files && files.length > 0) {
                    const imageFile = Array.from(files).find(f => f.type.startsWith('image/'));
                    if (imageFile) {
                        event.preventDefault();
                        processImage(imageFile);
                        return true;
                    }
                }
                return false;
            },
            handlePaste: (view, event) => {
                if (!editable) return false;
                const items = event.clipboardData?.items;
                if (items) {
                    for (const item of items) {
                        if (item.type.startsWith('image/')) {
                            event.preventDefault();
                            processImage(item.getAsFile());
                            return true;
                        }
                    }
                }
                return false;
            },
        },
    });

    const processImage = useCallback((file) => {
        if (!file || !file.type.startsWith('image/')) return;
        if (file.size > maxImageSize) {
            setAlertMessage(`Image trop volumineuse (max ${Math.round(maxImageSize / 1024 / 1024)} Mo)`);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (editor) {
                editor.chain().focus().setImage({ src: e.target.result }).run();
            }
        };
        reader.readAsDataURL(file);
    }, [editor, maxImageSize]);

    // Mettre à jour le contenu si la prop change (changement de note)
    useEffect(() => {
        if (editor && content !== undefined) {
            const normalized = normalizeContent(content);
            const currentHTML = editor.getHTML();
            if (normalized !== currentHTML) {
                editor.commands.setContent(normalized, false);
            }
        }
    }, [editor, content]);

    // Mettre à jour editable
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable);
        }
    }, [editor, editable]);

    if (!editor) return null;

    const handleImageButton = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) processImage(file);
        };
        input.click();
    };

    return (
        <div className={`rich-editor-wrapper ${editable ? '' : 'rich-editor-readonly'} ${className}`}>
            {/* BubbleMenu — toolbar flottante sur sélection de texte */}
            {editable && (
                <BubbleMenu
                    editor={editor}
                    options={{ placement: 'top' }}
                    className="rich-editor-bubble"
                    shouldShow={({ editor, state }) => {
                        const { from, to } = state.selection;
                        if (from === to) return false;
                        const node = state.doc.nodeAt(from);
                        if (node?.type.name === 'image') return false;
                        return true;
                    }}
                >
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        title="Gras (Ctrl+B)"
                    >
                        <b>G</b>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        title="Italique (Ctrl+I)"
                    >
                        <i>I</i>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        title="Souligné (Ctrl+U)"
                    >
                        <u>S</u>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')}
                        title="Barré"
                    >
                        <s>B</s>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        active={editor.isActive('highlight')}
                        title="Surligné"
                    >
                        <span className="bg-yellow-200 px-0.5">H</span>
                    </ToolbarButton>

                    <Separator />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive('heading', { level: 2 })}
                        title="Titre H2"
                    >
                        H2
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        active={editor.isActive('heading', { level: 3 })}
                        title="Titre H3"
                    >
                        H3
                    </ToolbarButton>

                    <Separator />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        title="Liste à puces"
                    >
                        •≡
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        title="Liste numérotée"
                    >
                        1.
                    </ToolbarButton>

                    <Separator />

                    <ToolbarButton
                        onClick={handleImageButton}
                        title="Insérer une image"
                    >
                        📎
                    </ToolbarButton>
                </BubbleMenu>
            )}

            {/* Contenu éditeur */}
            <EditorContent editor={editor} />

            {/* Toolbar fixe en bas */}
            {editable && (
                <div className="rich-editor-toolbar">
                    <button
                        type="button"
                        onClick={handleImageButton}
                        className="px-2 py-1 text-xs text-viking-leather dark:text-viking-bronze hover:bg-viking-bronze/20 rounded transition-colors"
                        title="Ajouter une image"
                    >
                        📎 Image
                    </button>
                    <span className="text-[10px] text-viking-leather/50 dark:text-viking-bronze/40">
                        Sélectionnez du texte pour formater • Glissez-déposez des images • Redimensionnez par les bords
                    </span>
                </div>
            )}
            {alertMessage && (
                <AlertModal
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
        </div>
    );
};

// Helper : extraire le texte brut du HTML pour les previews
export const stripHtml = (html) => {
    if (!html) return '';
    return html
        .replace(/<img[^>]*>/gi, '[image]')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
};

export default RichTextEditor;