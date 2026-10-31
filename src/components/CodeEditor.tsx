"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useRef } from "react";
import type { editor } from "monaco-editor";

// Catppuccin Mocha theme definition for Monaco
const CATPPUCCIN_MOCHA_THEME: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "cdd6f4", background: "181825" },
    { token: "comment", foreground: "9399b2", fontStyle: "italic" },
    { token: "keyword", foreground: "cba6f7" },
    { token: "string", foreground: "a6e3a1" },
    { token: "number", foreground: "fab387" },
    { token: "type", foreground: "f9e2af" },
    { token: "function", foreground: "89b4fa" },
    { token: "variable", foreground: "cdd6f4" },
    { token: "operator", foreground: "89dceb" },
  ],
  colors: {
    "editor.background": "#181825",
    "editor.foreground": "#cdd6f4",
    "editor.lineHighlightBackground": "#1e1e2e",
    "editor.selectionBackground": "#45475a",
    "editorCursor.foreground": "#f5e0dc",
    "editorLineNumber.foreground": "#6c7086",
    "editorLineNumber.activeForeground": "#bac2de",
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
    monaco.editor.defineTheme("catppuccin-mocha", CATPPUCCIN_MOCHA_THEME);
    monaco.editor.setTheme("catppuccin-mocha");
  };

  return (
    <Editor
      height="100%"
      language="python"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        fontSize: 16,
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
