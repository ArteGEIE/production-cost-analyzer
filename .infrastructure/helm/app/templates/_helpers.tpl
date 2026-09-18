{{- define "app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "app.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "app.labels" -}}
app.kubernetes.io/name: {{ include "app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}

{{- define "app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Name of the Secret that holds the app's sensitive env vars: the ESO-managed
<release>-secrets when externalSecret is enabled, otherwise the user-managed
secretEnv.existingSecret. Empty when neither option is configured.
*/}}
{{- define "app.secretName" -}}
{{- if .Values.externalSecret.enabled -}}
{{- printf "%s-secrets" (include "app.fullname" .) -}}
{{- else -}}
{{- .Values.secretEnv.existingSecret -}}
{{- end -}}
{{- end -}}

{{/*
List of env var names sourced from the secret above.
*/}}
{{- define "app.secretKeys" -}}
{{- if .Values.externalSecret.enabled -}}
{{- range .Values.externalSecret.secrets }}{{ .key }} {{ end -}}
{{- else -}}
{{- range .Values.secretEnv.keys }}{{ . }} {{ end -}}
{{- end -}}
{{- end -}}
