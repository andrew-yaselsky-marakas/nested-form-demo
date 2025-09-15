import React from "react";
import { useForm, Controller, FormProvider, useFormContext, useWatch } from "react-hook-form";
import { Box, Paper, Stack, Typography, TextField, Button, Divider, Switch, FormControlLabel } from "@mui/material";

const exampleSchema = {
  suppression_types: {
    name: "suppression_types",
    label: "Suppression type",
    order: 0,
    required: true,
    child: {
      suppression_categories: {
        name: "suppression_categories",
        label: "Suppression category",
        order: 0,
        child: {
          suppression_rules: {
            name: "suppression_rules",
            label: "Suppression rule",
            order: 0,
            fields: {
              rule_id: {
                key: "rule_id",
                label: "Rule identifier",
                required: true,
                order: 0,
                value: "R-789",
                type: "string",
              },
              condition: {
                key: "condition",
                label: "Condition",
                required: true,
                order: 1,
                value: "Exceeds threshold",
                type: "string",
              },
              status: {
                key: "status",
                label: "Is active?",
                required: false,
                order: 2,
                value: false,
                type: "boolean",
              },
            },
          },
        },
        fields: {
          category_id: {
            key: "category_id",
            label: "Category identifier",
            required: false,
            order: 0,
            value: "C-456",
            type: "string",
          },
          category_name: {
            key: "category_name",
            label: "Category name",
            required: false,
            order: 1,
            value: "Safety",
            type: "string",
          },
          priority_level: {
            key: "priority_level",
            label: "Priority level",
            required: false,
            order: 2,
            value: "High",
            type: "string",
          },
        },
      },
    },
    fields: {
      suppression_id: {
        key: "suppression_id",
        label: "Suppression identifier",
        required: true,
        order: 0,
        value: "S-123",
        type: "string",
      },
      name: {
        key: "name",
        label: "Suppression name",
        required: false,
        order: 1,
        value: "Default suppression",
        type: "string",
      },
      status: {
        key: "status",
        label: "Status",
        required: true,
        order: 2,
        value: true,
        type: "boolean",
      },
    },
  },
};

type FieldSpec = {
  key: string;
  label: string;
  required?: boolean;
  order?: number;
  value?: any;
  type?: string;
};

type BlockSpec = {
  name: string;
  label?: string;
  order?: number;
  required?: boolean;
  fields?: Record<string, FieldSpec>;
  child?: Record<string, BlockSpec>;
};

type Schema = Record<string, BlockSpec>;

function sortEntriesByOrder<T extends { order?: number }>(obj?: Record<string, T>): [string, T][] {
  if (!obj) return [];
  return Object.entries(obj).sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));
}

function extractDefaultValuesFromSchema(schema: Schema): any {
  const result: any = {};
  for (const [blockKey, block] of Object.entries(schema)) {
    result[blockKey] = {};
    if (block.fields) {
      result[blockKey].fields = {};
      for (const [fKey, fSpec] of Object.entries(block.fields)) {
        result[blockKey].fields[fKey] = fSpec.value ?? "";
      }
    }
    if (block.child) {
      result[blockKey].child = extractDefaultValuesFromSchema(block.child);
    }
  }
  return result;
}

function rebuildSchemaWithValues(schema: Schema, values: any): Schema {
  const out: Schema = {};
  for (const [blockKey, block] of Object.entries(schema)) {
    const vForBlock = values?.[blockKey] ?? {};
    const rebuilt: BlockSpec = {
      ...block,
      fields: block.fields
        ? Object.fromEntries(
            Object.entries(block.fields).map(([fk, fs]) => [fk, { ...fs, value: vForBlock?.fields?.[fk] ?? "" }])
          )
        : undefined,
      child: block.child ? rebuildSchemaWithValues(block.child, vForBlock?.child) : undefined,
    };
    out[blockKey] = rebuilt;
  }
  return out;
}

function useAnyFieldHasValue(blockPath: string, fieldKeys: string[]) {
  const { control } = useFormContext();
  const watchValues = useWatch({ control, name: `${blockPath}.fields` });
  return React.useMemo(() => {
    if (!watchValues) return false;
    return fieldKeys.some((k) => {
      const v = watchValues?.[k];
      if (v === undefined || v === null) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      return true;
    });
  }, [watchValues, fieldKeys]);
} = useFormContext();
  const watchValues = useWatch({ control, name: `${blockPath}.fields` });
  return React.useMemo(() => {
    if (!watchValues) return false;
    return fieldKeys.some((k) => {
      const v = watchValues?.[k];
      return !(v === undefined || v === null || String(v).trim() === "");
    });
  }, [watchValues, fieldKeys.join("")]);
}

function FieldRow({ name, label, required, disabledRequired, fullName, type }: any) {
  const { control } = useFormContext();

  if (type === "boolean") {
    return (
      <Controller
        name={fullName}
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
            label={label}
          />
        )}
      />
    );
  }

  return (
    <Controller
      name={fullName}
      control={control}
      rules={{
        validate: (v) => {
          if (required && !disabledRequired) {
            const isEmpty = v === undefined || v === null || String(v).trim() === "";
            return !isEmpty || "Required";
          }
          return true;
        },
      }}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={label ?? name}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || " "}
          size="small"
          fullWidth
        />
      )}
    />
  );
}

function Block({ blockKey, block, path }: { blockKey: string; block: BlockSpec; path: string }) {
  const blockPath = path ? `${path}.${blockKey}` : blockKey;
  const fieldEntries = sortEntriesByOrder(block.fields);
  const childEntries = sortEntriesByOrder(block.child);
  const fieldKeys = React.useMemo(() => fieldEntries.map(([k]) => k), [fieldEntries]);
  const anyFieldHasValue = useAnyFieldHasValue(blockPath, fieldKeys);
  const disableRequired = !!block.required && !anyFieldHasValue;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">
          {block.label ?? block.name}
          {block.required ? " *" : ""}
        </Typography>
        {fieldEntries.length > 0 && (
          <Stack spacing={1.5}>
            {fieldEntries.map(([fKey, fSpec]) => (
              <FieldRow
                key={fKey}
                name={fKey}
                label={fSpec.label}
                required={fSpec.required}
                disabledRequired={disableRequired}
                fullName={`${blockPath}.fields.${fKey}`}
                type={fSpec.type}
              />
            ))}
          </Stack>
        )}
        {childEntries.length > 0 && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Divider />
            {childEntries.map(([childKey, childBlock]) => (
              <Block key={childKey} blockKey={childKey} block={childBlock} path={blockPath + ".child"} />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

function SchemaForm({ schema }: { schema: Schema }) {
  const defaultValues = React.useMemo(() => extractDefaultValuesFromSchema(schema), [schema]);
  const methods = useForm({ defaultValues, mode: "onSubmit" });

  const onSubmit = (values: any) => {
    const rebuilt = rebuildSchemaWithValues(schema, values);
    console.log("Submitted values (same structure):", rebuilt);
    alert("Check the console for the submitted structure.");
  };

  const blockEntries = sortEntriesByOrder(schema);

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={methods.handleSubmit(onSubmit)} noValidate>
        {blockEntries.map(([bk, bspec]) => (
          <Block key={bk} blockKey={bk} block={bspec} path="" />
        ))}
        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained">Submit</Button>
          <Button type="button" variant="outlined" onClick={() => methods.reset(defaultValues)}>
            Reset
          </Button>
        </Stack>
      </Box>
    </FormProvider>
  );
}

export default function NestedFormBuilderDemo() {
  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Nested Form Builder (MUI + React Hook Form)
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        • Sorted by <code>order</code> • Conditional required per block • Returns identical structure on submit
      </Typography>
      <SchemaForm schema={exampleSchema as Schema} />
    </Box>
  );
}
