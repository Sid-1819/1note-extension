export function getText(element: Element): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  const editable =
    element.closest<HTMLElement>("[contenteditable=\"true\"]") ?? null;
  if (editable) {
    return editable.innerText;
  }
  return "";
}
