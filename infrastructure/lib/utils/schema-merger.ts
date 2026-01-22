import * as fs from 'fs';
import * as path from 'path';

export class SchemaMerger {
  static mergeSchemas(schemaDir: string, files: string[]): string {
    console.log('📖 Reading schema files...');
    
    const schemas = files.map(file => {
      const filePath = path.join(schemaDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Schema file not found: ${filePath}`);
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`  ✅ Loaded ${file}`);
      return content;
    });

    console.log('🔨 Merging schemas...');
    
    // Extract root type blocks
    const queries = this.extractRootTypeFields(schemas, 'Query');
    const mutations = this.extractRootTypeFields(schemas, 'Mutation');
    const subscriptions = this.extractRootTypeFields(schemas, 'Subscription');
    
    // Extract everything else (types, enums, inputs)
    const otherTypes = schemas.map(schema => 
      this.removeRootTypes(schema)
    ).join('\n\n');

    // Start with AWS scalars
    let merged = `# AWS AppSync Scalar Types
scalar AWSDate
scalar AWSTime
scalar AWSDateTime
scalar AWSTimestamp
scalar AWSEmail
scalar AWSJSON
scalar AWSURL
scalar AWSPhone
scalar AWSIPAddress

`;
    
    if (queries.length > 0) {
      merged += 'type Query {\n' + queries.join('\n') + '\n}\n\n';
      console.log(`  ✅ Merged ${queries.filter(q => !q.trim().startsWith('#')).length} queries`);
    }
    
    if (mutations.length > 0) {
      merged += 'type Mutation {\n' + mutations.join('\n') + '\n}\n\n';
      console.log(`  ✅ Merged ${mutations.filter(m => !m.trim().startsWith('#')).length} mutations`);
    }
    
    if (subscriptions.length > 0) {
      merged += 'type Subscription {\n' + subscriptions.join('\n') + '\n}\n\n';
      console.log(`  ✅ Merged ${subscriptions.filter(s => !s.trim().startsWith('#')).length} subscriptions`);
    }
    
    merged += otherTypes;
    
    console.log('✅ Schema merged successfully!');
    
    return merged;
  }

  private static extractRootTypeFields(schemas: string[], typeName: string): string[] {
    const allFields: string[] = [];
    const seenFieldNames = new Set<string>();

    schemas.forEach(schema => {
      const regex = new RegExp(`type ${typeName}\\s*\\{([^}]*)\\}`, 's');
      const match = schema.match(regex);

      if (!match) return;

      const fieldsBlock = match[1];
      const fields = this.parseFields(fieldsBlock);
      
      fields.forEach(field => {
        const fieldMatch = field.match(/^\s*(\w+)/);
        if (!fieldMatch) return;
        
        const fieldName = fieldMatch[1];
        
        if (seenFieldNames.has(fieldName)) {
          return;
        }
        
        seenFieldNames.add(fieldName);
        allFields.push(field);
      });
    });

    return allFields;
  }

  private static parseFields(fieldsBlock: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let parenDepth = 0;
    let braceDepth = 0;
    
    const lines = fieldsBlock.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!currentField && (!trimmed || trimmed.startsWith('#'))) {
        continue;
      }
      
      currentField += line + '\n';
      
      for (const char of line) {
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
      }
      
      if (parenDepth === 0 && braceDepth === 0 && trimmed && !trimmed.startsWith('#')) {
        if (trimmed.includes(':') || !trimmed.includes('(')) {
          fields.push(currentField.trim());
          currentField = '';
        }
      }
    }
    
    if (currentField.trim()) {
      fields.push(currentField.trim());
    }
    
    return fields;
  }

  private static removeRootTypes(schema: string): string {
    let result = schema;
    
    result = result.replace(/type Query\s*\{[^}]*\}/gs, '');
    result = result.replace(/type Mutation\s*\{[^}]*\}/gs, '');
    result = result.replace(/type Subscription\s*\{[^}]*\}/gs, '');
    result = result.replace(/\n{3,}/g, '\n\n');
    
    return result.trim();
  }
}