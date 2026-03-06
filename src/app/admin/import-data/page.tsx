'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FileJson, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Trash2,
  Database,
  FolderOpen,
  FilePlus,
  X
} from 'lucide-react';
import { 
  parseCSV, 
  parseJSON, 
  importMatches, 
  generateTemplateCSV, 
  generateTemplateJSON,
  validateData,
  getImportSummary,
  clearImportedData,
  ImportedMatch,
  parseLeagueFile,
  importMultipleLeagueFiles,
  LeagueFile
} from '@/services/data-import';

export default function ImportDataPage() {
  const [inputData, setInputData] = useState('');
  const [parsedData, setParsedData] = useState<ImportedMatch[]>([]);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [summary, setSummary] = useState(getImportSummary());
  
  // Multi-file import state
  const [leagueFiles, setLeagueFiles] = useState<LeagueFile[]>([]);
  const [currentFileName, setCurrentFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParseCSV = () => {
    const matches = parseCSV(inputData);
    setParsedData(matches);
    setValidation(validateData(matches));
    setImportResult(null);
  };

  const handleParseJSON = () => {
    const matches = parseJSON(inputData);
    setParsedData(matches);
    setValidation(validateData(matches));
    setImportResult(null);
  };

  const handleImport = () => {
    if (parsedData.length === 0) return;
    
    const result = importMatches(parsedData);
    setImportResult(result);
    
    if (result.success) {
      setSummary(getImportSummary());
    }
  };

  const handleClear = () => {
    clearImportedData();
    setSummary(null);
    setParsedData([]);
    setInputData('');
    setValidation(null);
    setImportResult(null);
    setLeagueFiles([]);
  };

  const downloadTemplate = (format: 'csv' | 'json') => {
    const content = format === 'csv' ? generateTemplateCSV() : generateTemplateJSON();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle adding a league file
  const handleAddLeagueFile = () => {
    if (!inputData.trim() || !currentFileName.trim()) return;
    
    const leagueFile = parseLeagueFile(inputData, currentFileName);
    if (leagueFile && leagueFile.matches.length > 0) {
      setLeagueFiles(prev => [...prev, leagueFile]);
      setInputData('');
      setCurrentFileName('');
      setImportResult(null);
    } else {
      setImportResult({
        success: false,
        message: 'No se pudieron parsear los datos del archivo'
      });
    }
  };

  // Remove a league file from the list
  const handleRemoveLeagueFile = (index: number) => {
    setLeagueFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Import all league files
  const handleImportAllLeagues = () => {
    if (leagueFiles.length === 0) return;
    
    const result = importMultipleLeagueFiles(leagueFiles);
    setImportResult({
      success: result.success,
      message: `Importados ${result.totalImported} partidos de ${result.filesProcessed} ligas. ${result.errors.length > 0 ? `Errores: ${result.errors.join(', ')}` : ''}`
    });
    
    if (result.success) {
      setSummary(getImportSummary());
      setLeagueFiles([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Importar Datos Históricos</h1>
          <p className="text-muted-foreground">
            Importa datos desde archivos CSV o JSON descargados de fuentes externas
          </p>
        </div>
        {summary && (
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="py-2 px-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">
                  {summary.totalImported.toLocaleString()} partidos importados
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="leagues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leagues">
            <FolderOpen className="w-4 h-4 mr-2" />
            Por Liga (JSON)
          </TabsTrigger>
          <TabsTrigger value="single">
            <FilePlus className="w-4 h-4 mr-2" />
            Archivo Único
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Download className="w-4 h-4 mr-2" />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Database className="w-4 h-4 mr-2" />
            Gestionar
          </TabsTrigger>
        </TabsList>

        {/* Multi-League Import Tab */}
        <TabsContent value="leagues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar por Liga</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pega el contenido de cada archivo JSON de liga. Formato: {"{ "}league: 39, matches: [...] {"}"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentFileName}
                  onChange={(e) => setCurrentFileName(e.target.value)}
                  placeholder="Nombre del archivo (ej: premier_league.json)"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
              </div>
              
              <Textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder={`Pega aquí el JSON de una liga completa...

Ejemplo:
{
  "league": 39,
  "leagueName": "Premier League",
  "matches": [
    {
      "id": 123,
      "date": "2024-01-15",
      "homeTeam": "Manchester United",
      "awayTeam": "Liverpool",
      "homeGoals": 2,
      "awayGoals": 1
    },
    ...
  ]
}`}
                className="min-h-[300px] font-mono text-sm"
              />
              
              <Button 
                onClick={handleAddLeagueFile}
                disabled={!inputData.trim() || !currentFileName.trim()}
                variant="outline"
              >
                <FilePlus className="w-4 h-4 mr-2" />
                Agregar Archivo a la Lista
              </Button>
            </CardContent>
          </Card>

          {leagueFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Archivos Listos para Importar</span>
                  <Badge variant="outline">{leagueFiles.length} ligas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {leagueFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div className="flex items-center gap-3">
                        <FileJson className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{file.leagueName}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {file.leagueId} • {file.matches.length} partidos • {file.fileName}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLeagueFile(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-blue-500">
                      {leagueFiles.reduce((sum, f) => sum + f.matches.length, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Partidos</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold">{leagueFiles.length}</div>
                    <div className="text-xs text-muted-foreground">Ligas</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold">
                      {[...new Set(leagueFiles.flatMap(f => [...new Set(f.matches.map(m => m.season))]))].length}
                    </div>
                    <div className="text-xs text-muted-foreground">Temporadas</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-green-500">Listo</div>
                    <div className="text-xs text-muted-foreground">Estado</div>
                  </div>
                </div>

                <Button 
                  onClick={handleImportAllLeagues}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Todas las Ligas
                </Button>
              </CardContent>
            </Card>
          )}

          {importResult && (
            <Card className={importResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span>{importResult.message}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Single File Import Tab */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pegar Datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder={`Pega aquí tus datos en formato CSV o JSON...\n\nEjemplo CSV:\nmatchId,date,leagueId,season,homeTeam,awayTeam,homeGoals,awayGoals\n1,2024-01-15,39,2024,Manchester United,Liverpool,2,1`}
                className="min-h-[200px] font-mono text-sm"
              />
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleParseCSV}
                  disabled={!inputData.trim()}
                  variant="outline"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Analizar CSV
                </Button>
                <Button 
                  onClick={handleParseJSON}
                  disabled={!inputData.trim()}
                  variant="outline"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Analizar JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          {parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Vista Previa</span>
                  <Badge variant="outline">{parsedData.length} partidos</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {validation && !validation.valid && (
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-500">Errores encontrados</p>
                          <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                            {validation.errors.slice(0, 5).map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                            {validation.errors.length > 5 && (
                              <li>... y {validation.errors.length - 5} más</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Fecha</th>
                        <th className="text-left py-2">Local</th>
                        <th className="text-left py-2">Visitante</th>
                        <th className="text-center py-2">Resultado</th>
                        <th className="text-center py-2">Liga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((match, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-2">{match.date?.split('T')[0]}</td>
                          <td className="py-2">{match.homeTeam}</td>
                          <td className="py-2">{match.awayTeam}</td>
                          <td className="py-2 text-center">
                            {match.homeGoals} - {match.awayGoals}
                          </td>
                          <td className="py-2 text-center">
                            <Badge variant="outline">{match.leagueId}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 5 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      ... y {parsedData.length - 5} partidos más
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleImport}
                  disabled={!validation?.valid}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {parsedData.length} Partidos
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Plantilla CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Formato simple compatible con Excel y Google Sheets
                </p>
                <Button variant="outline" onClick={() => downloadTemplate('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar CSV
                </Button>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`matchId,date,leagueId,season,homeTeam,awayTeam,homeGoals,awayGoals
1,2024-01-15,39,2024,Man United,Liverpool,2,1
2,2024-01-16,140,2024,Real Madrid,Barcelona,3,2`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  Plantilla JSON por Liga
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Formato recomendado para múltiples temporadas por liga
                </p>
                <Button variant="outline" onClick={() => downloadTemplate('json')}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar JSON
                </Button>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`{
  "league": 39,
  "leagueName": "Premier League",
  "matches": [
    {
      "id": 1,
      "date": "2024-08-15",
      "season": 2024,
      "homeTeam": "Man United",
      "awayTeam": "Liverpool",
      "homeGoals": 2,
      "awayGoals": 1
    }
  ]
}`}
                </pre>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campos Soportados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">Obligatorios</p>
                  <ul className="text-muted-foreground space-y-1 mt-1">
                    <li>• homeTeam / teams.home.name</li>
                    <li>• awayTeam / teams.away.name</li>
                    <li>• homeGoals / goals.home</li>
                    <li>• awayGoals / goals.away</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Recomendados</p>
                  <ul className="text-muted-foreground space-y-1 mt-1">
                    <li>• date / fixture.date</li>
                    <li>• league / leagueId</li>
                    <li>• season</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Opcionales (Odds)</p>
                  <ul className="text-muted-foreground space-y-1 mt-1">
                    <li>• odds.home</li>
                    <li>• odds.draw</li>
                    <li>• odds.away</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">IDs</p>
                  <ul className="text-muted-foreground space-y-1 mt-1">
                    <li>• id / matchId / fixture.id</li>
                    <li>• teams.home.id</li>
                    <li>• teams.away.id</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos Importados</CardTitle>
            </CardHeader>
            <CardContent>
              {summary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold">{summary.totalImported.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Partidos</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold">{summary.leagues.length}</div>
                      <div className="text-xs text-muted-foreground">Ligas</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold">{summary.seasons.length}</div>
                      <div className="text-xs text-muted-foreground">Temporadas</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold">{summary.errors}</div>
                      <div className="text-xs text-muted-foreground">Errores</div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Última importación: {new Date(summary.timestamp).toLocaleString()}
                  </div>

                  <Button 
                    variant="destructive" 
                    onClick={handleClear}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Todos los Datos Importados
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos importados</p>
                  <p className="text-sm">Ve a la pestaña "Por Liga" para agregar datos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
