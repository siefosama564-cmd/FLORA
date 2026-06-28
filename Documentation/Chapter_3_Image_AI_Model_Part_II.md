# Chapter 3: Image AI Model – Part II

## 3.1 Theoretical Foundations of Convolutional Neural Networks

The primary objective of Project FLORA is to provide smallholder farmers with a highly reliable visual diagnostic tool. To achieve this, the image processing pipeline must extract fine-grained features from leaves, such as the color of lesion margins, the texture of fungal pustules, and the shape of necrotic rings. Convolutional Neural Networks (CNNs) were selected as the core architecture for this task due to their unique ability to preserve spatial structures and automatically learn local visual patterns.

### 3.1.1 The Convolution Operation
At the core of the FLORA vision engine is the 2D convolution operation. Unlike traditional feedforward networks that flatten input images into a single vector (which destroys local spatial relationships), a convolutional layer processes input tensors by sliding small, learnable kernels across the height and width of the image. For an input image tensor X of shape (Height × Width × Channels) and a convolutional kernel K of shape (Kernel_Height × Kernel_Width × Channels × Filters), the forward pass output Y of shape (Output_Height × Output_Width × Filters) is computed at each spatial position:

Y[i, j, f] = b_f + sum(c from 1 to Channels) sum(m from 1 to Kernel_Height) sum(n from 1 to Kernel_Width) X[i * s + m, j * s + n, c] * K[m, n, c, f]

where s represents the stride (the step size with which the kernel slides across the input), b_f is the bias term for filter f, and the output spatial dimensions Height' and Width' are governed by the following scaling formulas:

Height' = floor((Height - Kernel_Height + 2 * padding) / stride) + 1

Width' = floor((Width - Kernel_Width + 2 * padding) / stride) + 1

In FLORA's implementation, padding is set to add zero-value pixels to the borders of the input, preserving spatial boundary details. This ensures that lesions located at the outer edges of the leaves are not discarded during feature extraction. The sliding kernel performs element-wise multiplication and sums the results, allowing the network to capture translation-invariant local features. This means that a disease spot will be detected regardless of where it appears in the frame.

### 3.1.2 Activation Functions and Non-Linearity
To model the complex biological patterns of plant pathologies, a CNN must incorporate non-linear activation functions. Without non-linearity, stacking multiple convolutional layers would mathematically collapse into a single linear transformation:

Y = W_n * (W_(n-1) * ... * (W_1 * X)) = W_equivalent * X

A purely linear network would be incapable of learning the complex decision boundaries needed to distinguish between 38 distinct crop-disease combinations.

FLORA leverages two primary activation functions:
1.  **Rectified Linear Unit (ReLU)**: Applied to the intermediate convolutional and fully connected layers, the ReLU function replaces negative pixel activations with zero:
    
    f(x) = max(0, x)

    ReLU is chosen because its gradient is constant (1) for positive inputs, which resolves the vanishing gradient problem during backpropagation and accelerates convergence compared to sigmoidal functions. The mathematical derivative of ReLU used during backpropagation is formulated as:

    f'(x) = 1 if x > 0, and f'(x) = 0 if x <= 0

    This step-wise constant derivative ensures that gradients propagate backward through active units without attenuation.
2.  **Softmax Function**: Applied to the final output layer of the classification head, the Softmax function normalizes the 38 raw logit activations z into a categorical probability distribution y_hat:
    
    y_hat_c = exp(z_c) / sum(k from 1 to 38) exp(z_k)

    where y_hat_c (ranging from 0 to 1) represents the predicted probability that the input leaf image belongs to class c, satisfying the condition that the sum of all 38 class probabilities equals exactly 1. During the backpropagation pass, the derivative of the Softmax function output y_hat_i with respect to input logit z_j is derived as:

    d y_hat_i / d z_j = y_hat_i * (delta_ij - y_hat_j)

    where delta_ij represents the Kronecker delta (delta_ij = 1 if i = j, and delta_ij = 0 if i != j). This joint derivative couples the gradient adjustments of all classes during loss updates.

### 3.1.3 Spatial Dimensionality Reduction via Pooling
As feature maps propagate deeper into the network, their spatial dimensions must be reduced. This spatial compression decreases computational complexity and enforces translation invariance.

Project FLORA leverages **Max Pooling** in the early stages to retain dominant features, and **Global Average Pooling (GAP)** in the final classification head. The mathematical operation of Max Pooling over a local window of size P_h × P_w with stride s is defined as:

Y[i, j, c] = max(m from 1 to P_h, n from 1 to P_w) X[i * s + m, j * s + n, c]

This preserves high-contrast features (such as dark necrotic spots) while discarding spatial noise.

In contrast, Global Average Pooling (GAP) is applied before the dense layers. GAP averages the spatial coordinates of each feature map:

y_c = (1 / (H * W)) * sum(i from 1 to H) sum(j from 1 to W) x_c(i, j)

where H and W are the height and width of the map. By reducing a 7 × 7 × 1536 tensor directly to a 1,536-dimensional vector, GAP avoids the need for flattening, reducing parameter bloat and preventing overfitting.

### 3.1.4 Backpropagation and Gradient Descent Mechanics
The learning process of the CNN is driven by the backpropagation algorithm, which uses the chain rule to compute gradients of the loss function L with respect to all trainable weights W and biases b. For a convolutional layer, the gradient of the loss L with respect to filter weight K[m, n, c, f] is calculated by accumulating the product of the incoming error gradient (delta) and the forward input activations (X):

d L / d K[m, n, c, f] = sum(i from 1 to Height') sum(j from 1 to Width') delta[i, j, f] * X[i * s + m, j * s + n, c]

where the error term delta[i, j, f] represents the partial derivative of the loss function with respect to the pre-activation output of that layer at spatial position (i, j) for filter f:

delta[i, j, f] = d L / d Y_pre[i, j, f]

This error term is backpropagated through the network. If the subsequent layer is a pooling layer (such as Max Pooling), the error is propagated only to the specific coordinate index that yielded the maximum activation during the forward pass:

d L / d X[i, j, c] = delta[i_max, j_max, c]

where (i_max, j_max) is the index of the maximum element inside the local pooling window.

These computed gradients are used to update the weights using the **Adam (Adaptive Moment Estimation)** optimization algorithm. Adam maintains running estimates of both the first moment (the mean) and the second raw moment (the uncentered variance) of the gradients:

m_t = beta_1 * m_(t-1) + (1 - beta_1) * g_t

v_t = beta_2 * v_(t-1) + (1 - beta_2) * (g_t)^2

where g_t is the gradient vector at step t, beta_1 = 0.9, and beta_2 = 0.999. Because m_t and v_t are typically initialized as vectors of zeros, they are biased towards zero, especially during the initial training steps. To correct this, bias-corrected moment estimates are computed:

m_hat_t = m_t / (1 - beta_1^t)

v_hat_t = v_t / (1 - beta_2^t)

where beta_1^t and beta_2^t represent the parameters raised to the power of the training step t. The model weights are then updated using the corrected moments:

W_t_1 = W_t - (alpha / (sqrt(v_hat_t) + epsilon)) * m_hat_t

where alpha is the learning rate (configured dynamically by our callbacks) and epsilon is a small constant (10^-8) added to prevent division by zero. The primary advantage of this formulation is that it dynamically adjusts the learning step for each individual parameter. Parameters associated with frequently occurring features (such as common leaf edges) receive smaller, more stable updates, whereas parameters associated with rare, critical diagnostic indicators (such as early-stage lesions) receive larger updates. This parameter-specific adaptation stabilizes the optimization path on highly non-convex loss surfaces, preventing the training process from getting stuck in saddle points or oscillating near local minima.

---

## 3.2 Backbone Architecture Selection

To implement a reliable vision classifier within our computational budget, our team leveraged **Transfer Learning**. Rather than training a deep network from scratch—which requires hundreds of thousands of labeled plant images and weeks of GPU cluster training—we adapted models pre-trained on the 1,000-class ImageNet dataset. We conducted a comparative analysis of four candidate backbone architectures:

### 3.2.1 VGG-16
VGG-16 is a classic architecture composed of simple 3 × 3 convolutional layers stacked sequentially.
*   *Limitations*: VGG-16 contains over 138 million parameters, which creates a massive file size and slow execution. The absence of skip connections makes it prone to vanishing gradients when training deep layers, and it proved too bulky for real-time deployment on lightweight servers.

### 3.2.2 ResNet-50
ResNet-50 introduced "skip connections" that bypass one or more layers:

a_l_2 = g(z_l_2 + a_l)

*   *Advantages*: Solves the vanishing gradient problem, allowing the training of deeper networks.
*   *Limitations*: The parameter size (25 million) remains large, causing higher inference latency when deployed on lightweight servers.

### 3.2.3 MobileNetV2
MobileNetV2 is designed for mobile applications, using depthwise separable convolutions to minimize parameter size (~3.4 million).
*   *Limitations*: The focus on lightweight execution leads to a drop in classification accuracy on fine-grained leaf spots.

### 3.2.4 EfficientNetV2-B3 (Selected Architecture)
EfficientNetV2-B3 was selected as the optimal backbone for FLORA due to:
1.  **Compound Scaling**: Balances depth, width, and resolution using a fixed compound coefficient, optimizing both representation capacity and speed. The compound scaling is governed by the following system of equations:

depth: d = alpha^phi

width: w = beta^phi

resolution: r = gamma^phi

s.t. alpha * beta^2 * gamma^2 ~ 2, alpha >= 1, beta >= 1, gamma >= 1

where phi is a user-controlled exponent that determines resources, and alpha, beta, gamma are constant scaling factors. For EfficientNetV2-B3, these parameters are tuned to provide the optimal trade-off between floating-point operations (FLOPs) and accuracy.
2.  **Fused-MBConv Blocks**: Replaces depthwise convolutions in early layers with standard 3x3 convolutions to increase training speed:
    
    Fused-MBConv = Conv_3x3 -> Squeeze-and-Excitation -> Project_1x1

    Standard MBConv blocks use depthwise separable convolutions (a depthwise 3x3 convolution followed by a pointwise 1x1 projection). While this reduces parameter counts, it does not fully utilize modern GPU vector computing cores. Fused-MBConv blocks fuse these steps into a single standard 3x3 convolution in the early stages, maximizing training throughput.
3.  **Squeeze-and-Excitation (SE) Optimization**: Incorporates channel-attention mechanisms that dynamically recalibrate channel-wise feature responses. The SE block pools spatial dimensions, passes the channel vector through a small bottleneck bottleneck dense layer, and applies a sigmoid activation to output channel weight scales:
    
    SE(x) = Sigmoid( W_2 * ReLU( W_1 * GAP(x) ) ) * x

    This recalibration emphasizes critical feature channels (like lesion color changes) while downweighting redundant backgrounds.
4.  **Built-in Preprocessing**: Incorporates normalization layers directly within the tensor graph, accepting raw uint8 inputs and performing scaling on the GPU, preventing preprocessing mismatches.

### 3.2.5 Backbone Evaluation Summary
The candidate backbones were benchmarked across operational dimensions, as summarized in Table 3.1:

| Metric | VGG-16 | ResNet-50 | MobileNetV2 | EfficientNetV2-B3 (Selected) |
| :--- | :--- | :--- | :--- | :--- |
| **Total Parameters** | 138 Million | 25 Million | 3.4 Million | 12.9 Million |
| **ImageNet Top-1 Acc.** | 71.5% | 76.0% | 72.0% | **82.1%** |
| **Training Speed** | Slow | Medium | Very Fast | **Fast (Fused-MBConv)** |
| **FLORA Classification** | Degraded | Acceptable | Unstable | **Superior (98.3%)** |

[INSERT IMAGE HERE: Figure 3.1 - Architecture of the EfficientNetV2-B3 Backbone illustrating Fused-MBConv and standard MBConv blocks]

---

## 3.3 Custom Classification Head Design

The original ImageNet classification head of the backbone was replaced with a custom head designed specifically for our 38-class plant pathology task. This design prioritizes regularization to prevent the pre-trained weights from overfitting to our specific dataset.

```
Backbone Output Tensor (7×7×1536)
           │
           ▼
GlobalAveragePooling2D  (Reduces dimensions to 1D vector of length 1536)
           │
           ▼
BatchNormalization      (Normalizes activations, stabilizing gradient flow)
           │
           ▼
Dropout (0.4)           (Deactivates 40% of units, preventing co-adaptation)
           │
           ▼
Dense (512, ReLU)       (Fully connected projection layer)
           │
           ▼
BatchNormalization      (Second normalization step)
           │
           ▼
Dropout (0.2)           (Secondary regularization layer)
           │
           ▼
Dense (38, Softmax)     (Outputs 38 class probabilities)
```

### 3.3.1 Mathematical Formulation of Key Layers

#### 1. Global Average Pooling 2D (GAP)
Instead of flattening the 7 × 7 × 1536 output tensor (which would add over 75,000 parameters), GAP computes the spatial average of each feature map:

y_c = (1 / (H * W)) * sum(i from 1 to H) sum(j from 1 to W) x_c(i, j)

This operation reduces the tensor to a 1,536-dimensional vector, preventing parameter explosion and improving the model's resistance to overfitting.

#### 2. Batch Normalization (BN)
To accelerate training, Batch Normalization is added to normalize activations within a mini-batch:

mean_B = (1 / m) * sum(i from 1 to m) x_i

var_B = (1 / m) * sum(i from 1 to m) (x_i - mean_B)^2

x_hat_i = (x_i - mean_B) / sqrt(var_B + epsilon)

y_i = gamma * x_hat_i + beta

where epsilon is a small constant (10^-5) added for numerical stability.

#### 3. Dropout Regularization
Prevents co-adaptation of weights by randomly setting a fraction p of unit activations to zero during training:

r_j = Bernoulli(1 - p)

y_hat = r * y

During validation and inference, the dropout masks are deactivated, and activations are scaled by (1 - p) to ensure mathematical continuity.

---

## 3.4 Two-Phase Training Strategy

To adapt the pre-trained weights without destroying the valuable feature extraction layers, we implemented a **Two-Phase Training Strategy** on NVIDIA T4 GPUs.

[INSERT IMAGE HERE: Figure 3.2 - Chart Illustrating the Two-Phase Training Schedule: Phase 1 (Head Warmup) vs. Phase 2 (Selective Backbone Fine-Tuning)]

### 3.4.1 Phase 1: Classification Head Warmup
In the first phase, we froze all layers of the pre-trained EfficientNetV2-B3 backbone:

W_backbone = constant

Only the weights of our custom classification head were set as trainable.
*   **Rationale**: The custom classification head is randomly initialized. If we trained the entire network immediately with a standard learning rate, the large gradients generated by the random head weights would propagate backward and destroy the highly optimized pre-trained feature extractors in the backbone.
*   **Settings**: We trained the head for 10 epochs using the Adam optimizer with a learning rate of 10^-3, utilizing the standard Categorical Cross-Entropy loss:
    
    Loss = - sum(i from 1 to N) sum(c from 1 to 38) y_i_c * log(y_hat_i_c)

    Batch size was set to 64.

### 3.4.2 Phase 2: Backbone Fine-Tuning
Once the custom head was warmed up and the loss stabilized, we unfroze the top **40 layers** of the backbone, making them trainable alongside the custom classification head.
*   **Rationale**: Lower layers in a CNN learn universal visual primitives (like edges and textures). The top layers learn high-level semantic shapes (such as the specific concentric rings of early blight or the margins of rust spots). Unfreezing the top 40 layers allowed these feature extractors to adapt specifically to agricultural crop structures.
*   **Settings**: We used a 100x smaller learning rate of 10^-5 to make micro-adjustments to the weights, training for an additional 20 epochs.

#### Mini-Batch Cross-Entropy Formulation
During the backpropagation update in Phase 2, the loss value is calculated across a mini-batch of size M_batch (where M_batch = 64). The mini-batch loss is formulated as:

Loss_batch = - (1 / M_batch) * sum(i from 1 to M_batch) sum(c from 1 to 38) y_i_c * log(y_hat_i_c)

where y_i_c represents the one-hot target label index for sample i, and y_hat_i_c is the corresponding Softmax output probability. Calculating the loss over a batch averages out the gradient steps, avoiding visual parameter updates from oscillating and ensuring stable weight updates.

---

## 3.5 Training Callbacks and Hyperparameter Optimization

To monitor training and prevent overfitting, we configured four key Keras callbacks:

### 3.5.1 Model Checkpoint (`ModelCheckpoint`)
Saves model weights whenever validation loss decreases:

Save if Loss_val_t < Loss_val_t-1

This ensures that even if the model begins to overfit in later epochs, the best performing weights are saved as `flora_best.keras`.

### 3.5.2 Early Stopping (`EarlyStopping`)
Terminates training if validation loss does not improve for a set number of epochs (4 epochs in Phase 1, 6 epochs in Phase 2), preventing overfitting.

### 3.5.3 Learning Rate Reduction on Plateau (`ReduceLROnPlateau`)
Reduces the learning rate if validation loss plateaus for 2 consecutive epochs. The parameter setup is declared programmatically as follows:

```python
reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.3,
    patience=2,
    verbose=1,
    min_lr=1e-6
)
```

The division factor of 0.3 adjusts the learning rate:

alpha_t_1 = alpha_t * 0.3

Reducing the learning rate on plateaus allows the model to refine weights in local minima, stabilizing the loss convergence curve.

### 3.5.4 CSV Logger (`CSVLogger`)
Recorded epoch metrics (accuracy, loss, val_accuracy, val_loss) to CSV files for performance curve plotting.

---

## 3.6 Performance Evaluation & Metric Results

### 3.6.1 Detailed Epoch-by-Epoch Training Analysis
In Phase 1, training loss dropped from 3.12 to 0.72 as the custom head adapted, stabilizing at 89.2% validation accuracy. In Phase 2, unfreezing the top layers initially caused slight loss fluctuations, but validation accuracy rose steadily, converging at epoch 18 with a final validation accuracy of **98.3%** and validation loss of 0.062. Early stopping terminated training at epoch 24.

[INSERT IMAGE HERE: Figure 3.3 - Performance Curves: Training and Validation Accuracy/Loss across Phase 1 and Phase 2]

### 3.6.2 Metric Breakdown: Precision, Recall, and F1-Score
We evaluated the model using standard metrics:

Precision = TP / (TP + FP)

Recall = TP / (TP + FN)

F1-Score = 2 * (Precision * Recall) / (Precision + Recall)

The model achieved an overall macro-average F1-Score of **98.2%**.

### 3.6.3 Empirically Compiled Classification Performance Metrics
Validation scores across major crop classes are summarized in Table 3.2:

| Crop Class Name | Precision | Recall | F1-Score | Validation Support |
| :--- | :---: | :---: | :---: | :---: |
| Apple___Apple_scab | 0.98 | 0.97 | 0.98 | 504 |
| Apple___Black_rot | 0.99 | 0.99 | 0.99 | 496 |
| Apple___Cedar_apple_rust | 1.00 | 0.99 | 1.00 | 440 |
| Apple___healthy | 0.99 | 1.00 | 0.99 | 502 |
| Blueberry___healthy | 1.00 | 1.00 | 1.00 | 454 |
| Cherry___Powdery_mildew | 1.00 | 0.99 | 1.00 | 421 |
| Cherry___healthy | 0.99 | 1.00 | 1.00 | 456 |
| Corn___Cercospora_leaf_spot | 0.95 | 0.96 | 0.95 | 410 |
| Corn___Common_rust | 1.00 | 1.00 | 1.00 | 477 |
| Corn___Northern_Leaf_Blight | 0.96 | 0.95 | 0.96 | 485 |
| Corn___healthy | 1.00 | 1.00 | 1.00 | 466 |
| Grape___Black_rot | 0.98 | 0.98 | 0.98 | 472 |
| Grape___Esca | 0.99 | 0.98 | 0.99 | 480 |
| Grape___Leaf_blight | 0.99 | 0.99 | 0.99 | 430 |
| Grape___healthy | 1.00 | 1.00 | 1.00 | 423 |
| Orange___Haunglongbing | 1.00 | 1.00 | 1.00 | 550 |
| Peach___Bacterial_spot | 0.98 | 0.98 | 0.98 | 459 |
| Peach___healthy | 1.00 | 1.00 | 1.00 | 432 |
| Pepper___Bacterial_spot | 0.98 | 0.99 | 0.98 | 478 |
| Pepper___healthy | 0.99 | 0.99 | 0.99 | 490 |
| Potato___Early_blight | 0.99 | 0.99 | 0.99 | 485 |
| Potato___Late_blight | 0.98 | 0.99 | 0.99 | 485 |
| Potato___healthy | 1.00 | 1.00 | 1.00 | 452 |
| Squash___Powdery_mildew | 1.00 | 1.00 | 1.00 | 434 |
| Strawberry___Leaf_scorch | 0.99 | 1.00 | 1.00 | 444 |
| Strawberry___healthy | 1.00 | 1.00 | 1.00 | 456 |
| Tomato___Bacterial_spot | 0.97 | 0.98 | 0.97 | 525 |
| Tomato___Early_blight | 0.95 | 0.96 | 0.95 | 480 |
| Tomato___Late_blight | 0.96 | 0.95 | 0.95 | 505 |
| Tomato___Leaf_Mold | 0.98 | 0.97 | 0.98 | 470 |
| Tomato___Septoria_leaf_spot | 0.97 | 0.96 | 0.97 | 436 |
| Tomato___Spider_mites | 0.98 | 0.99 | 0.98 | 435 |
| Tomato___Target_Spot | 0.96 | 0.95 | 0.96 | 457 |
| Tomato___Yellow_Leaf_Curl | 0.99 | 0.99 | 0.99 | 590 |
| Tomato___Mosaic_virus | 0.99 | 0.99 | 0.99 | 448 |
| Tomato___healthy | 0.99 | 0.99 | 0.99 | 481 |

#### Statistical Justification of Class Performance Variations
While the model achieved an overall validation accuracy of 98.3%, slight variations occurred across specific crop classes. Understanding these drops is critical for defining safety thresholds:
1.  **Tomato Early Blight (Precision: 0.95)**: Early blight leaves contain concentric brown spots. During the initial stages of infection, these lesions can look similar to **Tomato Septoria Leaf Spot** or **Tomato Target Spot**, leading to slight model confusion.
2.  **Corn Cercospora Leaf Spot (F1-Score: 0.95)**: Because of the elongated nature of Cercospora spots, the CNN occasionally misclassified them as **Northern Leaf Blight**, particularly when leaf veins were distorted or shadows occurred in the source photo.
3.  **Apple Scab (Recall: 0.97)**: Scab lesions appear as velvety, olive-colored patches. Under variable lighting conditions, early-stage scab spots can look similar to **Black Rot** lesions.

To prevent these statistical confusions from causing incorrect treatment recommendations, project FLORA combines visual diagnostics with a conversational chatbot. When the CNN classifier outputs a prediction with a high confusion risk, the system prompts the chatbot to ask the user follow-up questions about field history and environment to clarify the diagnosis.

---

## 3.7 Real-World Prediction Pipeline & Background Removal

A major challenge when deploying vision models in the field is background noise. Raw images contain complex backgrounds (soil, weeds, hands). To solve this, FLORA incorporates a **Real-World Prediction Pipeline**:

[INSERT IMAGE HERE: Figure 3.4 - The FLORA Real-World Inference Pipeline: Raw Image -> U²-Net Segmentation -> White Background Compositing -> EfficientNetV2-B3 Classification]

### 3.7.1 Stage 1: U²-Net Background Removal
When an image is uploaded, it is routed to the Python Flask server where the **rembg** library (powered by a pre-trained **U²-Net** model) processes it.

U²-Net is designed specifically for salient object detection. Unlike standard U-Net architectures, U²-Net utilizes a two-level nested U-structure. The key block is the **Receptive Field Block (RSU)**, which embeds a miniature U-Net within the macro-level layers. This design uses dilated convolutions to extract multi-scale features without losing spatial resolution, allowing the model to capture high-contrast margins (like leaf edges) while retaining the global leaf structure.

The U²-Net architecture consists of nested levels of RSU blocks:
*   **RSU-7 (Encoder Stage 1)**: Captures large-scale spatial structures using 7 levels of symmetric downsampling and upsampling.
*   **RSU-6 (Encoder Stage 2)**: Captures intermediate detail using 6 levels of downsampling.
*   **RSU-5 (Encoder Stage 3)**: Resolves fine boundary features using 5 levels of downsampling.
*   **RSU-4 (Encoder Stage 4 & Bottleneck)**: Operates on compressed feature vectors, using dilated convolutions to capture context without losing resolution.

This hierarchical structure allows U²-Net to capture fine boundary details (such as narrow leaf teeth and petioles) without requiring high computational overhead. During the training of the U²-Net model, the loss function is calculated as the sum of the binary cross-entropy loss across all six output levels of the RSU blocks, plus the loss of the final fused output map:

Loss_segmentation = sum(d from 1 to 6) w_d * L_bce(S_d, G) + w_fuse * L_bce(S_fuse, G)

where S_d is the output map of stage d, S_fuse is the final fused output map, G is the ground-truth binary segmentation mask, and w_d, w_fuse are weighting parameters. This multi-scale loss formulation forces each individual RSU stage to produce clean boundaries, resulting in a robust, high-contrast alpha mask M to isolate the leaf:

I_foreground_i_j = I_input_i_j * M_i_j

This removes background pixels from the image tensor.

### 3.7.2 Stage 2: White Background Compositing and Image Resizing
Because the EfficientNetV2-B3 model was trained on dataset images that featured light backgrounds, the segmented leaf is composited onto a solid white canvas:

I_final_i_j = I_foreground_i_j + (1 - M_i_j) * [255, 255, 255]

The resulting image is converted to standard RGB, resized to 224 x 224 pixels, and expanded on the batch axis to form a tensor of shape (1, 224, 224, 3) before running prediction.

### 3.7.3 Confidence Threshold Safety Gates
To prevent false-positive diagnoses on out-of-distribution (OOD) images (e.g. photos of faces or non-agricultural objects), the prediction service implements a safety gate. The threshold checks are coded programmatically inside the prediction middleware:

```python
def check_prediction_safety(prediction_prob, is_segmented):
    max_prob = np.max(prediction_prob)
    threshold = 0.45 if is_segmented else 0.70
    
    if max_prob < threshold:
        return {
            "class_name": "Unknown — plant not in training data",
            "confidence": float(max_prob),
            "status": "REJECTED"
        }
    return {
        "class_name": class_names[np.argmax(prediction_prob)],
        "confidence": float(max_prob),
        "status": "APPROVED"
    }
```

If the model's highest softmax output falls below these thresholds, the system rejects the diagnosis, returning the label: `"Unknown — plant not in training data"`.

---

## 3.8 Exported Model Artifacts

Following validation, the model configuration was exported into three key files to be deployed on the Python Flask server:
1.  **flora_plant_model.keras (~83 MB)**: The complete model file containing network architecture and optimized weights.
2.  **class_names.json**: A JSON file containing the ordered list of the 38 class names to map model output indices to text.
3.  **model_config.json**: A configuration file detailing integration settings:
    *   `model_name`: Model identifier (`FLORA_EfficientNetV2B3`).
    *   `num_classes`: Categorical classes (38).
    *   `image_size`: Resizing width/height (224).
    *   `confidence_threshold_clean`: Clean image gate limit (0.70).
    *   `confidence_threshold_realworld`: Segmented image gate limit (0.45).
    *   `background_removal`: Instruction set for preprocessing logic (true).
