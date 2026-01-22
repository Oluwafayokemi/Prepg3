export const formatAWSDate = (dateString: string): string => {
  try {
    if (!dateString) return new Date().toISOString().split("T")[0];
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split("T")[0];
    }
    return date.toISOString().split("T")[0]; // Returns "2024-12-31"
  } catch (error) {
    return new Date().toISOString().split("T")[0];
  }
};