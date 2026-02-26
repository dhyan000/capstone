import io
import pandas as pd
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from typing import Optional

class TextExtractor:
    @staticmethod
    def extract_from_pdf(file_bytes: bytes) -> str:
        """Extract text from a PDF file using PyMuPDF."""
        text = ""
        with fitz.open(stream=file_bytes, filetype="pdf") as doc:
            for page in doc:
                text += page.get_text()
        return text

    @staticmethod
    def extract_from_docx(file_bytes: bytes) -> str:
        """Extract text from a Word (.docx) file."""
        doc = DocxDocument(io.BytesIO(file_bytes))
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])

    @staticmethod
    def extract_from_csv(file_bytes: bytes) -> str:
        """Extract text from a CSV file."""
        df = pd.read_csv(io.BytesIO(file_bytes))
        return df.to_string(index=False)

    @staticmethod
    def extract_from_excel(file_bytes: bytes) -> str:
        """Extract text from an Excel (.xlsx) file."""
        df = pd.read_excel(io.BytesIO(file_bytes))
        return df.to_string(index=False)

    @classmethod
    def extract(cls, file_bytes: bytes, filename: str, content_type: str) -> Optional[str]:
        """Dispatch extraction based on filename or content type."""
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        
        try:
            if ext == "pdf" or content_type == "application/pdf":
                return cls.extract_from_pdf(file_bytes)
            elif ext == "docx" or content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                return cls.extract_from_docx(file_bytes)
            elif ext == "csv" or content_type == "text/csv":
                return cls.extract_from_csv(file_bytes)
            elif ext in ["xlsx", "xls"] or content_type in ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]:
                return cls.extract_from_excel(file_bytes)
            elif content_type.startswith("text/"):
                return file_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            print(f"Error extracting text from {filename}: {e}")
            return None
        
        return None
