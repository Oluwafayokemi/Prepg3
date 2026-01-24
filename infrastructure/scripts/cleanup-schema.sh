#!/bin/bash
# cleanup-schema.sh

cd graphql

echo "🧹 Cleaning GraphQL schemas..."

# Backup files first
for file in investor.graphql property.graphql admin.graphql super-admin.graphql notification.graphql transaction.graphql document.graphql marketing.graphql; do
  cp "$file" "$file.backup"
done

# Remove all comments using Perl (works on macOS and Linux)
perl -pi -e 's/#.*$//' investor.graphql
perl -pi -e 's/#.*$//' property.graphql
perl -pi -e 's/#.*$//' admin.graphql
perl -pi -e 's/#.*$//' super-admin.graphql
perl -pi -e 's/#.*$//' notification.graphql
perl -pi -e 's/#.*$//' transaction.graphql
perl -pi -e 's/#.*$//' document.graphql
perl -pi -e 's/#.*$//' marketing.graphql



echo "✅ Comments removed"

# Verify
echo ""
echo "Checking for remaining comments:"
if grep -q "#" investor.graphql property.graphql admin.graphql super-admin.graphql notification.graphql transaction.graphql document.graphql marketing.graphql; then
  echo "❌ Some comments remain"
  grep -n "#" *.graphql | head -10
else
  echo "✅ All comments removed successfully"
fi

# Clean merged schema
cd ..
rm -f graphql/schema-merged.graphql

echo ""
echo "✅ Cleanup complete!"
echo "Backup files saved as *.graphql.backup"