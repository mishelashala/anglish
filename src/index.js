const vscode = require("vscode");
const replacementDictionary = require("./replacementDictionary");

function activate(context) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "yellow",
  });

  const diagnosticsCollection =
    vscode.languages.createDiagnosticCollection("wordOrigin");

  function updateDecorations() {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      return;
    }

    const text = editor.document.getText();
    const words = Object.keys(replacementDictionary);
    const regex = new RegExp(`\\b(${words.join("|")})\\b`, "gi");
    const decorationsArray = [];
    const diagnostics = [];

    let match;
    while ((match = regex.exec(text))) {
      const startPos = editor.document.positionAt(match.index);
      const endPos = editor.document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      const decoration = { range };
      decorationsArray.push(decoration);

      const diagnostic = new vscode.Diagnostic(
        range,
        `Word of Latin, Greek, or French origin. Consider replacing with "${
          replacementDictionary[match[0].toLowerCase()]
        }"`,
        vscode.DiagnosticSeverity.Warning
      );
      diagnostics.push(diagnostic);
    }

    editor.setDecorations(decorationType, decorationsArray);
    diagnosticsCollection.set(editor.document.uri, diagnostics);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(
      updateDecorations,
      null,
      context.subscriptions
    ),
    vscode.workspace.onDidChangeTextDocument(
      updateDecorations,
      null,
      context.subscriptions
    )
  );

  // Hover Provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider("plaintext", {
      provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
          return;
        }

        const word = document.getText(range).toLowerCase();
        const replacement = replacementDictionary[word];

        if (replacement) {
          return new vscode.Hover(
            `Consider using "**${replacement}**" instead.`
          );
        }
      },
    })
  );

  // Code Action Provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      "plaintext",
      {
        provideCodeActions(document, range, context) {
          const diagnostics = context.diagnostics.filter(
            (diag) => diag.source === "wordOrigin"
          );
          const actions = [];

          diagnostics.forEach((diagnostic) => {
            const word = document.getText(diagnostic.range).toLowerCase();
            const replacement = replacementDictionary[word];
            if (replacement) {
              const action = new vscode.CodeAction(
                `Replace with "${replacement}"`,
                vscode.CodeActionKind.QuickFix
              );
              action.edit = new vscode.WorkspaceEdit();
              action.edit.replace(document.uri, diagnostic.range, replacement);
              action.diagnostics = [diagnostic];
              actions.push(action);
            }
          });

          return actions;
        },
      },
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
      }
    )
  );
}

exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
