"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useRef } from "react";
import type { editor } from "monaco-editor";

// Gruvbox Dark theme definition for Monaco
const GRUVBOX_DARK_THEME: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "e5e5e5", background: "111111" },
    { token: "comment", foreground: "928374", fontStyle: "italic" },
    { token: "keyword", foreground: "fb4934" },
    { token: "string", foreground: "b8bb26" },
    { token: "number", foreground: "d3869b" },
    { token: "type", foreground: "fabd2f" },
    { token: "function", foreground: "8ec07c" },
    { token: "variable", foreground: "83a598" },
    { token: "operator", foreground: "fe8019" },
  ],
  colors: {
    "editor.background": "#111111",
    "editor.foreground": "#e5e5e5",
    "editor.lineHighlightBackground": "#171717",
    "editor.selectionBackground": "#262626",
    "editorCursor.foreground": "#e5e5e5",
    "editorLineNumber.foreground": "#525252",
    "editorLineNumber.activeForeground": "#a3a3a3",
  },
};

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ value, onChange }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme("gruvbox-dark", GRUVBOX_DARK_THEME);
    monaco.editor.setTheme("gruvbox-dark");
  };

  return (
    <Editor
      height="100%"
      language="python"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 16 },
        lineNumbers: "on",
        renderLineHighlight: "line",
        tabSize: 4,
        insertSpaces: true,
      }}
    />
  );
}
