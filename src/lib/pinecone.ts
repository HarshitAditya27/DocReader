import { Pinecone, Vector, utils as PineconeUtils } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "./embeddings";
import md5 from "md5";
import { covertToAscii } from "./utils";

let pinecone: Pinecone | null = null;

export const getPineconeClient = () => {
  return new Pinecone({
    environment: process.env.PINECONE_ENVIRONMENT!,
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecode(fileKey: string) {
  console.log("Downloading s3 into file system");
  const file_name = await downloadFromS3(fileKey);
  if (!file_name) {
    throw new Error("Could not download from s3");
  }
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[]; 

const document = await Promise.all(pages.map(prepareDocument))
const vectors = await Promise.all(document.flat().map(embedDocument))
const client = await getPineconeClient() 
const pinecodeIndex = client.Index('docreader') 
console.log('inserting vectors into pinecode')
const namespace= covertToAscii(fileKey);
PineconeUtils.chunkedUpsert(pinecodeIndex,vectors,namespace,10) 
return document[0]

}

async function embedDocument(doc:Document){{
  try{
    const embeddings = await getEmbeddings(doc.pageContent) 
    const hash = md5(doc.pageContent)

    return{
      id:hash,
      value:embeddings, 
      metadata:{
        text:doc.metadata.text, 
        pageNumber:doc.metadata.pageNumber
      }
    } as Vector
  } 
  catch(error){
     console.log("Error while embedding document",error)
  }
}}


export const truncateStringByBytes = (str:string, bytes: number) => {
  const enc = new TextEncoder; 
  return new TextDecoder('utf-8').decode(enc.encode(str).slice(0,bytes)) 
}



async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([new Document([pageContent,
  metadata:{
    pageNumber:metadata.loc.pageNumber, 
    text: truncateStringByBytes(pageContent,36000) 

  }
  ])]);
}
