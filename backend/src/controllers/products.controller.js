import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '../services/products.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { uploadImage } from '../utils/upload.js';

export async function getProductsHandler(request, reply) {
  try {
    const products = await listProducts(request.query);
    return sendSuccess(reply, 200, products);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return sendError(reply, statusCode, err.message);
  }
}

export async function createProductHandler(request, reply) {
  try {
    const product = await createProduct(request.body);
    return sendSuccess(reply, 201, product);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(reply, statusCode, err.message);
  }
}

export async function updateProductHandler(request, reply) {
  try {
    const product = await updateProduct(request.params.id, request.body);
    return sendSuccess(reply, 200, product);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(reply, statusCode, err.message);
  }
}

export async function deleteProductHandler(request, reply) {
  try {
    await deleteProduct(request.params.id);
    return reply.code(204).send();
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(reply, statusCode, err.message);
  }
}

export async function uploadProductImageHandler(request, reply) {
  try {
    const file = await request.file();

    if (!file) {
      return sendError(reply, 400, 'No file uploaded');
    }

    const uniqueName = `${Date.now()}-${file.filename}`;
    const imageUrl = await uploadImage(file.file, file.mimetype, uniqueName);

    const productId = request.query.productId;
    let updatedProductId = null;

    if (productId) {
      const updated = await updateProduct(productId, { imageUrl });
      updatedProductId = updated.id;
    }

    return sendSuccess(reply, 200, { imageUrl, updatedProductId });
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(reply, statusCode, err.message);
  }
}

