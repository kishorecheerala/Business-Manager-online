
// Utility to handle Google Sheets Export

const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

interface SheetProperties {
    title: string;
}

export const createSpreadsheet = async (accessToken: string, title: string): Promise<{ spreadsheetId: string, url: string } | null> => {
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    title: title
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to create spreadsheet: ${response.status} ${errText}`);
        }

        const data = await response.json();
        return {
            spreadsheetId: data.spreadsheetId,
            url: data.spreadsheetUrl
        };
    } catch (error) {
        console.error("Error creating spreadsheet:", error);
        throw error;
    }
};

export const appendDataToSheet = async (accessToken: string, spreadsheetId: string, values: string[][]) => {
    try {
        // Range: 'Sheet1' implies appending to the first sheet, finding the next available row.
        const range = 'Sheet1!A1'; 
        
        const response = await fetch(`${API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: values
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to append data: ${response.status} ${errText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error appending data:", error);
        throw error;
    }
};

export const formatHeaderRow = async (accessToken: string, spreadsheetId: string) => {
    try {
        // Formats the first row (headers) to be bold and have a background color
        const batchUpdateRequest = {
            requests: [
                {
                    repeatCell: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: 1
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.8, green: 0.9, blue: 0.8 }, // Light Green
                                textFormat: { bold: true }
                            }
                        },
                        fields: "userEnteredFormat(backgroundColor,textFormat)"
                    }
                }
            ]
        };

        await fetch(`${API_BASE}/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(batchUpdateRequest)
        });
    } catch (e) {
        console.warn("Failed to format headers (non-critical):", e);
    }
};

export const exportReportToSheet = async (
    accessToken: string, 
    reportTitle: string, 
    headers: string[], 
    dataRows: string[][]
) => {
    // 1. Create Sheet
    const sheetData = await createSpreadsheet(accessToken, reportTitle);
    if (!sheetData) throw new Error("Could not create spreadsheet.");

    // 2. Prepare Data (Header + Rows)
    const allValues = [headers, ...dataRows];

    // 3. Write Data
    await appendDataToSheet(accessToken, sheetData.spreadsheetId, allValues);

    // 4. Style Header (Optional)
    await formatHeaderRow(accessToken, sheetData.spreadsheetId);

    return sheetData.url;
};
