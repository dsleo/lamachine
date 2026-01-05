
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { CONSTRAINTS, type Constraint, type ConstraintParam } from '@/lib/constraints';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';

type ConstraintId = (typeof CONSTRAINTS)[number]['id'] | 'none';

type ConstraintMeta = {
  missingLetters?: string[];
};

export default function OulipoEditor() {
  const [constraintId, setConstraintId] = useState<ConstraintId>('none');
  const [param, setParam] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [meta, setMeta] = useState<ConstraintMeta | null>(null);
  const [palindromeChecked, setPalindromeChecked] = useState<boolean>(false);
  const [palindromeResult, setPalindromeResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isClient, setIsClient] = useState(false);

  const paramCardRef = useRef<HTMLDivElement>(null);
  const editorCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const selectedConstraint = useMemo(() =>
    CONSTRAINTS.find(c => c.id === constraintId),
    [constraintId]
  );
  useEffect(() => {
    if (selectedConstraint && paramCardRef.current) {
      paramCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedConstraint]);

  const validateAndSetText = (currentText: string) => {
    if (!selectedConstraint) {
      setError(null);
      setMeta(null);
      setText(currentText);
      return;
    }

    // Palindrome: no automatic validation while typing,
    // only validate when the user clicks the check button.
    if (selectedConstraint.id === 'palindrome') {
      setError(null);
      setMeta(null);
      setText(currentText);
      return;
    }

    const requiresParam = selectedConstraint.parameter.kind !== 'none';
    const hasParam = !requiresParam || !!param;

    if (hasParam) {
      const { isValid, error: validationError, meta: validationMeta } = selectedConstraint.validate(currentText, param);

      setMeta((validationMeta as ConstraintMeta | null) ?? null);

      if (!isValid) {
        setError(validationError || 'Erreur de contrainte');

        // If the user is trying to add or replace characters while the
        // constraint is violated, block the change by keeping the previous
        // valid text. Only allow edits that shorten the text so they can
        // backspace their way back to a valid state.
        if (currentText.length >= text.length) {
          setViolationCount((count) => count + 1);
          return;
        }

        setText(currentText);
        return;
      }

      setError(null);
      if (selectedConstraint.id !== 'pangram') {
        setMeta(null);
      }
    } else {
      setError(null);
      setMeta(null);
    }

    setText(currentText);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    validateAndSetText(newText);
  };

  const handleConstraintChange = (id: ConstraintId) => {
    setConstraintId(id);
    setParam('');
    setText('');
    setError(null);
    setViolationCount(0);
    setMeta(null);
    setPalindromeChecked(false);
    setPalindromeResult(null);
  }

  const handleParamChange = (newParam: string) => {
    setParam(newParam);
    setViolationCount(0);
    setPalindromeChecked(false);
    setPalindromeResult(null);

    if (selectedConstraint && selectedConstraint.parameter.kind !== 'none') {
      const { isValid, error: validationError, meta: validationMeta } = selectedConstraint.validate(text, newParam);
      setMeta(validationMeta as ConstraintMeta | null ?? null);
      if (!isValid) {
        setError(validationError || 'Erreur de contrainte');
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }

  const showParamCard = !!selectedConstraint;
  const requiresParam = selectedConstraint && selectedConstraint.parameter.kind !== 'none';
  const hasParam = !requiresParam || !!param;
  const showEditorCard = showParamCard && hasParam;

  const handlePalindromeCheck = () => {
    if (!selectedConstraint || selectedConstraint.id !== 'palindrome') return;
    const { isValid, error: validationError } = selectedConstraint.validate(text, '');
    setPalindromeChecked(true);
    if (isValid) {
      setPalindromeResult({ ok: true, message: 'Le texte est un palindrome parfait.' });
    } else {
      setPalindromeResult({ ok: false, message: validationError || 'Le texte n’est pas un palindrome parfait.' });
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary">Écrire sous la contrainte</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Choisissez une contrainte</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={constraintId} onValueChange={handleConstraintChange} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONSTRAINTS.map((constraint) => (
              <Label key={constraint.id} htmlFor={constraint.id} className="flex flex-col items-start gap-2 rounded-md border p-4 hover:bg-accent/50 hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={constraint.id} id={constraint.id} />
                  <span className="font-bold">{constraint.name}</span>
                </div>
                <span className="text-sm text-muted-foreground pl-6">{constraint.description}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {showParamCard && selectedConstraint && selectedConstraint.parameter.kind !== 'none' && (
        <div ref={paramCardRef} className="animate-in fade-in-50 duration-500">
          <Card>
            <CardHeader>
              <CardTitle>{selectedConstraint.parameter.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {selectedConstraint.parameter.kind === 'select' && (
                  <Select value={param} onValueChange={handleParamChange}>
                    <SelectTrigger id="param-select" className="w-full md:w-[180px]">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedConstraint.parameter.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedConstraint.parameter.kind === 'text' && (
                  <Textarea
                    value={param}
                    onChange={(e) => handleParamChange(e.target.value)}
                    placeholder={selectedConstraint.parameter.placeholder}
                    rows={2}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showEditorCard && (
        <div ref={editorCardRef} className="animate-in fade-in-50 duration-500">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Écrivez</CardTitle>
                {selectedConstraint?.id === 'palindrome' && (
                  <button
                    type="button"
                    onClick={handlePalindromeCheck}
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Vérifier le palindrome
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={text}
                onChange={handleTextChange}
                placeholder="Commencez à taper..."
                className={cn(
                  "typewriter-textarea",
                  error && "border-destructive focus-visible:ring-destructive"
                )}
                rows={10}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex flex-col gap-1 text-left">
                  {selectedConstraint?.id === 'pangram' && meta?.missingLetters && (
                    <div className="inline-flex flex-wrap items-center gap-1 rounded-full border px-2 py-0.5">
                      <span className="font-medium">Lettres manquantes :</span>
                      {meta.missingLetters.length === 0 ? (
                        <span className="text-emerald-600">Aucune, le pangramme est complet !</span>
                      ) : (
                        <span className="tracking-widest uppercase">
                          {meta.missingLetters.join(' ')}
                        </span>
                      )}
                    </div>
                  )}
                  {selectedConstraint?.id === 'palindrome' && palindromeChecked && palindromeResult && (
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
                        palindromeResult.ok
                          ? 'border-emerald-500 text-emerald-600'
                          : 'border-destructive/40 text-destructive'
                      )}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{palindromeResult.message}</span>
                    </div>
                  )}
                </div>
                {selectedConstraint?.id !== 'pangram' && (
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border",
                      violationCount > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-muted text-muted-foreground"
                    )}
                  >
                    <AlertCircle className="h-3 w-3" />
                    <span>
                      {violationCount === 0
                        ? "Aucune violation de la contrainte"
                        : `${violationCount} ${violationCount === 1 ? "violation" : "violations"} de la contrainte`}
                    </span>
                  </div>
                )}
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
