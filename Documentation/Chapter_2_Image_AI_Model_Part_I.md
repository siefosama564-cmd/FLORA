# Chapter 2: Image AI Model – Part I

## 2.1 Introduction to Computer Vision in Smart Agriculture

### 2.1.1 The Visual Dimension of Crop Pathologies
Plant diseases caused by fungi, bacteria, viruses, or environmental stressors present visible symptoms on their foliage. Leaves are the primary organs for photosynthesis, and their health is reflected on their surface. When a pathogen infects a leaf, it alters the cell structure and leaf patterns:
*   Fungal infections (like rusts and mildews) form visible white, orange, or gray powdery growth on the leaf surface. Fungi reproduce by extending spore-producing structures (hyphae) through the stomata, creating powdery coatings that block sunlight and reduce chlorophyll.
*   Bacterial infections create water-soaked spots that dry up and turn necrotic. Bacteria multiply in the intercellular space, releasing enzymes that break down cell walls and form dry, brown lesions.
*   Viral infections disrupt plant growth hormones, resulting in structural leaf curling, mosaic-like yellowing, and stunting. Viruses replicate inside plant cells, disrupting nitrogen utilization and causing irregular cell divisions that distort the leaf shape.
Because these symptoms are visually distinct, they can be processed and diagnosed using computer vision techniques.

### 2.1.2 Limitations of Traditional Machine Learning in Agriculture
Early plant disease detection systems relied on traditional machine learning pipelines. These required human experts to manually design feature extraction algorithms, focusing on three visual features:
1.  **Color**: Using color histograms and color spaces (RGB, HSV, Lab) to detect lesion discoloration.
2.  **Texture**: Using algorithms (like Local Binary Patterns and Gray-Level Co-occurrence Matrices) to analyze micro-textural changes from cell necrosis.
3.  **Shape**: Using geometric descriptors (eccentricity, aspect ratio, border roughness) to identify leaf deformation boundaries.
These extracted features were then classified using models like Support Vector Machines (SVM), Random Forests, or K-Nearest Neighbors (KNN).

While effective in controlled laboratories, these methods failed in real-world agricultural fields. Hand-crafted feature extractors are highly sensitive to lighting changes, shadows, leaf orientation, and background noise. A model trained on uniform laboratory lighting would frequently misclassify leaves when tested under direct sunlight or shadows, which alter the color histograms and texture patterns.

### 2.1.3 The Deep Learning Revolution and Convolutional Neural Networks
Deep learning resolved these limitations by automated feature learning. Convolutional Neural Networks (CNNs) learn feature representations directly from raw pixel arrays during training. 

A CNN passes the input image through trainable convolutional layers. In each layer, multiple kernels (filters) slide across the image, computing dot products between the kernel weights and local pixel values:

S(i, j) = (I * K)(i, j) = ∑_m ∑_n I(i - m, j - n) * K(m, n)

Where I represents the input image, K is the convolutional kernel, and S(i, j) is the output activation value at spatial coordinates (i, j).

CNNs learn visual features hierarchically. Early layers detect simple primitives like edges, color boundaries, and basic shapes. Deeper layers combine these primitives to detect complex textures, such as the concentric rings of Alternaria lesions or powdery mildew growth. The final fully connected layers then perform the classification. This automatic, hierarchical feature extraction makes CNNs robust to variations in lighting, scale, and background clutter, making them the standard for agricultural vision systems.

[INSERT IMAGE HERE: Figure 2.1 - Comparative Flowchart: Traditional Machine Learning Pipeline with Hand-Crafted Features vs. Modern Deep CNN Pipeline]

---

## 2.2 Survey of Agricultural Image Datasets

To build a reliable vision model for project FLORA, we evaluated three major agricultural image datasets:

### 2.2.1 The PlantVillage Dataset
PlantVillage contains 54,303 color images of healthy and diseased crop leaves across 38 classes, covering 14 crop species. The images were captured in controlled laboratories using uniform lighting and flat, solid backgrounds.
*   **Collection Setup**: Images were collected using digital SLR cameras under diffused laboratory light. Individual leaves were cut from plants and placed flat against a solid gray or black background board to isolate the leaf structure.
*   **Strengths**: High-quality annotations, consistent lighting, and clear contrast.
*   **Weaknesses**: The clean, laboratory setting makes it artificial. Models trained on it suffer from "background bias," where the network learns background features rather than leaf features. Deployed in the field, these models struggle to generalize to images containing soil, weeds, shadows, or human hands.

### 2.2.2 The DiaMOS Dataset
DiaMOS contains sweet potato leaf images captured directly in the field under natural sunlight using mobile phone cameras.
*   **Collection Setup**: Images were captured in sweet potato fields using various smartphone sensors under uncontrolled daylight conditions. Leaves were photographed on the plant, incorporating soil, shadows, and hands.
*   **Strengths**: Real-world variability, including natural shadows, complex backgrounds, and diverse camera sensors.
*   **Weaknesses**: Limited only to sweet potatoes, making it too narrow for FLORA's multi-crop requirement.

### 2.2.3 The Pest24 Dataset
Pest24 is a large-scale agricultural pest dataset containing trap images with bounding-box annotations for 24 insect pest categories.
*   **Collection Setup**: Images were collected from automatic trap stations in agricultural fields. The cameras captured insects trapped on sticky boards.
*   **Strengths**: Large volume of data, bounding-box annotations.
*   **Weaknesses**: Designed for pest detection in traps, not leaf pathology classification. It does not align with the mobile image-upload user flow designed for FLORA.

### 2.2.4 Comparative Evaluation Matrix
The datasets were compared across technical dimensions to select the optimal training set for FLORA, as summarized in Table 2.1:

| Evaluation Metric | PlantVillage (Selected Base) | DiaMOS | Pest24 |
| :--- | :--- | :--- | :--- |
| **Total Image Count** | 54,303 (original) / 87,000+ (augmented) | ~3,500 | 25,378 |
| **Crop Diversity** | High (14 crop species) | Low (Sweet potato only) | Medium |
| **Pathology Classes** | 38 classes (incl. healthy states) | 4 classes | 24 pest categories |
| **Background Complexity** | Controlled (solid background) | Complex (field, soil, weeds) | Trap background |
| **Label Verification** | Gold standard (academic validation) | Medium | High |
| **Linguistic Adaptability** | High | Low | Medium |

---

## 2.3 Dataset Selection and Taxonomic Characteristics

Based on our analysis, the **New Plant Diseases Dataset (Augmented)**, a reorganized and expanded derivative of the **PlantVillage** dataset, was selected. It contains **87,867 images** split into training, validation, and testing sets, covering **38 distinct classes**. 

This dataset covers major cash crops grown in Egypt, such as potatoes, tomatoes, and grapes, which are the main agricultural products in the Delta. Structuring the model's target labels around these specific crop hosts and their scientific pathogens is crucial for providing accurate, actionable agronomic advice. For instance, distinguishing between early blight (*Alternaria solani*) and late blight (*Phytophthora infestans*) on potatoes is not merely a theoretical exercise; late blight is caused by an oomycete (water mold) and requires active systemic fungicides like Metalaxyl, whereas early blight is caused by a true fungus and is treated with contact fungicides like Chlorothalonil. Misclassifying these pathogens would lead to complete crop loss. The 38 classes are indexed alongside their biological pathogens and visual hallmarks, as summarized in Table 2.2:

| Class Folder Name | Plant Host | Pathogen / Condition | Pathogen Scientific Name | Primary Visual Symptoms |
| :--- | :--- | :--- | :--- | :--- |
| **Apple___Apple_scab** | Apple | Fungi | *Venturia inaequalis* | Olive-green/black velvety spots on leaves, turning brown. |
| **Apple___Black_rot** | Apple | Fungi | *Botryosphaeria obtusa* | Concentric reddish-brown spots with purple margins. |
| **Apple___Cedar_apple_rust** | Apple | Fungi | *Gymnosporangium juniperi* | Bright orange-yellow spots on the upper leaf surface. |
| **Apple___healthy** | Apple | Healthy Control | N/A | Normal green coloration; intact leaf structure. |
| **Blueberry___healthy** | Blueberry | Healthy Control | N/A | Green, smooth foliage with no lesions. |
| **Cherry___Powdery_mildew** | Cherry | Fungi | *Podosphaera clandestina* | White powdery coating; leaves curl upward. |
| **Cherry___healthy** | Cherry | Healthy Control | N/A | Clean leaf margins; healthy green surface. |
| **Corn___Cercospora_leaf_spot** | Corn | Fungi | *Cercospora zeae-maydis* | Rectangular gray lesions parallel to leaf veins. |
| **Corn___Common_rust** | Corn | Fungi | *Puccinia sorghi* | Golden-brown raised pustules containing powdery spores. |
| **Corn___Northern_Leaf_Blight** | Corn | Fungi | *Exserohilum turcicum* | Long, elliptical grayish-green cigar-shaped lesions. |
| **Corn___healthy** | Corn | Healthy Control | N/A | Broad, green leaves without chlorosis. |
| **Grape___Black_rot** | Grape | Fungi | *Guignardia bidwellii* | Small, circular reddish-brown spots with dark borders. |
| **Grape___Esca** | Grape | Fungi Complex | *Phaeomoniella chlamydospora* | Interveinal drying, creating tiger-stripe leaf patterns. |
| **Grape___Leaf_blight** | Grape | Fungi | *Pseudocercospora vitis* | Large, irregular dark brown lesions. |
| **Grape___healthy** | Grape | Healthy Control | N/A | Intact lobed leaf structures with vibrant green color. |
| **Orange___Haunglongbing** | Orange | Bacteria | *Candidatus Liberibacter* | Blotchy leaf mottling, asymmetrical yellowing. |
| **Peach___Bacterial_spot** | Peach | Bacteria | *Xanthomonas arboricola* | Water-soaked spots that dry and fall out (shot-holes). |
| **Peach___healthy** | Peach | Healthy Control | N/A | Smooth, elongated green leaves. |
| **Pepper___Bacterial_spot** | Pepper | Bacteria | *Xanthomonas campestris* | Small, dark, circular lesions. |
| **Pepper___healthy** | Pepper | Healthy Control | N/A | Vibrant green foliage; absence of chlorotic spots. |
| **Potato___Early_blight** | Potato | Fungi | *Alternaria solani* | Dark spots with concentric rings (target-board shape). |
| **Potato___Late_blight** | Potato | Oomycete | *Phytophthora infestans* | Large water-soaked spots; white fuzzy mold on margins. |
| **Potato___healthy** | Potato | Healthy Control | N/A | Well-formed green potato leaflets. |
| **Raspberry___healthy** | Raspberry | Healthy Control | N/A | Normal compound leaves with no spot pathologies. |
| **Soybean___healthy** | Soybean | Healthy Control | N/A | Clean trifoliate leaves with no signs of mildew. |
| **Squash___Powdery_mildew** | Squash | Fungi | *Erysiphe cichoracearum* | Severe white powdery coating over squash foliage. |
| **Strawberry___Leaf_scorch** | Strawberry | Fungi | *Diplocarpon earlianum* | Purple blotches that brown and cover the leaf surface. |
| **Strawberry___healthy** | Strawberry | Healthy Control | N/A | Clean trifoliate strawberry leaves. |
| **Tomato___Bacterial_spot** | Tomato | Bacteria | *Xanthomonas perforans* | Small, dark, necrotic lesions with yellow halos. |
| **Tomato___Early_blight** | Tomato | Fungi | *Alternaria solani* | Target-like concentric rings on older foliage. |
| **Tomato___Late_blight** | Tomato | Oomycete | *Phytophthora infestans* | Gray-brown lesions; white mold underneath in humidity. |
| **Tomato___Leaf_Mold** | Tomato | Fungi | *Passalora fulva* | Pale green spots on upper leaf; olive mold on lower. |
| **Tomato___Septoria_leaf_spot** | Tomato | Fungi | *Septoria lycopersici* | Small circular spots with dark borders and grey centers. |
| **Tomato___Spider_mites** | Tomato | Mite Pests | *Tetranychus urticae* | Tiny yellow stippling spots; fine silky webs on undersides. |
| **Tomato___Target_Spot** | Tomato | Fungi | *Corynespora cassiicola* | Double concentric dark brown spots on the foliage. |
| **Tomato___Yellow_Leaf_Curl** | Tomato | Virus | TYLCV (Begomovirus) | Leaf margins curling upward; stunting and yellowing. |
| **Tomato___Mosaic_virus** | Tomato | Virus | ToMV (Tobamovirus) | Green-yellow mosaic mottling, distorted leaves (shoestrings). |
| **Tomato___healthy** | Tomato | Healthy Control | N/A | Normal green leaves with standard physiology. |

[INSERT IMAGE HERE: Figure 2.2 - Grid Displaying Sample Images from the selected 38-Class Plant Disease Dataset]

### 2.3.2 Biological Pathogenesis and Environmental Triggers of Key Pathologies
To build a classification model capable of distinguishing between visual symptoms in the field, it is essential to understand the biological mechanisms of disease development and the environmental conditions that trigger outbreaks in Egypt:

1.  **Potato Early Blight (*Alternaria solani*)**: This fungal pathogen targets older potato foliage first. Spore germination is triggered by alternating wet and dry leaf conditions, thriving in temperatures between 24°C and 29°C. Visually, the spots appear as dark, concentric rings ("target board" pattern) caused by the localized collapse of host cells as the fungus releases alternaric acid, which disrupts surrounding tissue.
2.  **Potato Late Blight (*Phytophthora infestans*)**: Classified as an oomycete, this highly destructive pathogen requires free moisture on the leaf surface and cool temperatures (15°C to 21°C) to germinate. It spreads rapidly, forming large, water-soaked, dark green or black lesions. Under high humidity, a delicate white fuzzy layer of sporangia emerges from the stomata on the lower surface of the leaf.
3.  **Tomato Yellow Leaf Curl Virus (TYLCV)**: Transmitted by the sweetpotato whitefly (*Bemisia tabaci*), this virus replicates within the plant's phloem tissue, disrupting vascular transportation. It alters growth hormones, causing leaves to curl upward and inward, turn bright yellow, and experience severe growth stunting. Outbreaks are most common during dry, hot summer months when whitefly populations increase.
4.  **Grape Esca (Tiger-Stripe Pattern)**: Esca is caused by a complex of wood-inhabiting fungi (including *Phaeomoniella chlamydospora* and *Phaeoacremonium minimum*). These fungi slowly degrade the vine's water-transport system, releasing phytotoxins that accumulate in the leaves. The resulting visual symptom is a distinct "tiger-stripe" pattern of interveinal chlorosis and necrosis, while the leaf margins turn dry and brown.

---

## 2.4 Data Cleaning and Folder Standardization

To ensure model integrity, we verified directory layouts and file structures before training.

### 2.4.1 File Integrity Verification
An automated Python validation script traversed the extracted dataset. The script's execution logic followed a strict sequence:
1.  **Traverse Subdirectories**: Iterated through the directory tree using `os.walk`, scanning all 38 class folders.
2.  **PIL Validation**: Attempted to open each file using PIL's `Image.open(file_path)` and verified image integrity using the `.verify()` method. Truncated files or images with invalid headers were caught:
    ```python
    try:
        with Image.open(file_path) as img:
            img.verify()
    except (IOError, SyntaxError) as e:
        # Flag and remove corrupt file
        os.remove(file_path)
    ```
3.  **OS Metadata Purging**: Cleared temporary system files (such as `Thumbs.db` and `.DS_Store`) that are created by operating system file browsers, which cause errors during batch data loading.
4.  **Format Standardization**: Verified that all image formats were standardized to `.JPG`. Any file with lowercase extensions (`.jpg`, `.jpeg`) was renamed to standard `.JPG` to ensure consistency in regex file search queries. A total of 14 corrupt files were purged from the dataset.

### 2.4.2 Directory Layout and Folder Mapping
The dataset was organized into a standardized structure consisting of three root directories: `train`, `valid`, and `test`. Within `train` and `valid`, the image directories were organized into 38 subfolders matching the class labels, using a triple underscore (`___`) delimiter:

```
New Plant Diseases Dataset (Augmented)/
├── train/
│   ├── Apple___Apple_scab/
│   │   ├── image1.JPG
│   │   └── ...
│   ├── Apple___healthy/
│   └── [36 other class folders]
├── valid/
│   ├── Apple___Apple_scab/
│   ├── Apple___healthy/
│   └── [36 other class folders]
└── test/
    ├── test_image_1.jpg
    └── [24 flat test images without labels]
```
This structure allows for automated label extraction based on directory names using standard deep learning data loaders.

---

## 2.5 Preprocessing and Input Pipeline

Deep neural networks require input tensors of uniform dimensions. A structured preprocessing pipeline was developed to standardize inputs.

### 2.5.1 Spatial Dimensionality Standardization
The target input resolution for the FLORA model was set to **224 × 224 pixels** with **3 color channels (RGB)**, which is the native input size for the EfficientNetV2-B3 architecture. Resizing images to 224x224 represents a critical design choice:
*   It reduces the spatial resolution of the leaves, which speeds up training and reduces the model's memory footprint on the GPU.
*   It preserves sufficient fine-grained structural detail (such as individual fungal spots, lesion edges, and vein patterns) to allow the model to make accurate classifications.

The resizing operation was performed using **bilinear interpolation**. For a target destination pixel at coordinates (x, y), its intensity value is calculated by taking a weighted average of the four nearest source pixels (P1, P2, P3, P4):

P(x, y) = (1 - dx) * (1 - dy) * P1 + dx * (1 - dy) * P2 + (1 - dx) * dy * P3 + dx * dy * P4

where dx and dy are the fractional distances from the source coordinates. Bilinear interpolation prevents severe aliasing and grid distortion during downscaling.

### 2.5.2 Built-In Normalization vs. Manual Rescaling
In traditional computer vision pipelines, image pixel values (which are read as integers in the range [0, 255]) must be manually rescaled to a floating-point range, typically [0.0, 1.0] or [-1.0, 1.0], to prevent exploding gradients.

However, the FLORA model leverages the built-in preprocessing layers of the **EfficientNetV2-B3** framework. When initializing the model with `include_preprocessing=True`, the architecture incorporates a normalization layer directly at the start of the computational graph:

x_normalized = (x_input - mean) / std

This built-in layer accepts raw `uint8` tensors (integers from 0 to 255) and performs the normalization internally on the GPU. This offers two key engineering advantages:
1.  **Reduced Client-Side Overhead**: The backend and frontend do not need to perform floating-point division or channel-wise normalization before sending images to the model. They pass the raw image array, reducing latency.
2.  **Prevention of Preprocessing Mismatches**: By embedding the normalization values inside the saved model file (`flora_plant_model.keras`), there is zero risk of the deployment environment using different scaling factors than the training environment.

### 2.5.3 Optimized Data Pipeline using the `tf.data` API
To keep the dual NVIDIA T4 GPUs on Kaggle fully saturated during training, the data loading pipeline was engineered using the `tf.data.Dataset` API. Loading and preprocessing images sequentially on a single CPU thread creates a bottleneck, leaving the GPU idle.

To resolve this, the input pipeline was structured as follows:

```
[Disk Storage] ──> [tf.data Loader] ──> [Parallel Prefetch] ──> [GPU VRAM]
  (Raw JPGs)      (Decode & Resize)     (Buffer next batch)     (Model Fit)
```

1.  **Categorical Label Mode**: Custom loaders fetched images using Keras with label mode set to categorical. This operation automatically converts the class folder names into one-hot encoded vectors of length 38:
    
    y = [0, 0, ..., 1, ..., 0] transposed

    This encoding matches the categorical cross-entropy loss function used during training.
2.  **Prefetching and Autotuning**: The datasets were optimized using the `.prefetch(buffer_size=tf.data.AUTOTUNE)` method. While the GPU is performing backpropagation on batch N, the CPU prepends, decodes, and resizes batch N + 1 in system memory. The `AUTOTUNE` parameter dynamically adjusts the buffer size based on available system resources, minimizing pipeline latency.

---

## 2.6 Data Augmentation Pipeline

Data augmentation is a critical technique used to prevent overfitting and improve the generalizability of deep learning models. Overfitting occurs when a neural network learns the specific noise and details of the training dataset (such as a specific angle of light or background leaf orientation) rather than the underlying disease features. 

To expand the dataset artificially and simulate the visual diversity of real-world agricultural settings, a Keras sequential data augmentation pipeline was developed. This pipeline is active **only during the training phase** (i.e., when calling the model with `training=True`). During validation and inference, the augmentation layers are automatically bypassed.

[INSERT IMAGE HERE: Figure 2.3 - Grid Showing a Single Leaf Image Subjected to the Various Transformations in the Data Augmentation Pipeline]

The augmentation pipeline consists of six transformations applied sequentially to each image in a batch:

```python
data_augmentation = keras.Sequential([
    layers.RandomFlip('horizontal_and_vertical'),
    layers.RandomRotation(0.2),
    layers.RandomZoom(0.15),
    layers.RandomBrightness(0.15),
    layers.RandomContrast(0.15),
    layers.RandomTranslation(0.1, 0.1),
], name='augmentation')
```

### 2.6.1 Mathematical Formulations of Augmentation Layers

#### 1. Random Flip
The random flip layer performs a reflection across the vertical axis, the horizontal axis, or both. For a pixel at spatial coordinates (x, y) in an image of width W and height H, the horizontal reflection (x', y') is modeled as:

x' = -x + W - 1

y' = y

This reflection simulates different camera orientations relative to the plant, helping the model recognize disease patterns regardless of leaf positioning.

#### 2. Random Rotation
This transformation randomly rotates the image by an angle theta selected from the range [-20%, +20%] of a full circle (equivalent to approximately ±72°). The rotation is performed around the center of the image (x_c, y_c) using an affine transformation:

x' = x * cos(theta) - y * sin(theta) + x_c * (1 - cos(theta)) + y_c * sin(theta)

y' = x * sin(theta) + y * cos(theta) + y_c * (1 - cos(theta)) - x_c * sin(theta)

In the field, leaves grow at various angles, and farmers capture photos with arbitrary rotations. This parameter ensures the model learns rotation-invariant features.

#### 3. Random Zoom
This layer applies a random zoom in or out by up to 15%. This is executed by scaling the image coordinates centered around (x_c, y_c) with a scaling factor s in the range [0.85, 1.15]:

x' = s * x + x_c * (1 - s)

y' = s * y + y_c * (1 - s)

This simulates changes in the camera-to-leaf distance, training the model to recognize disease lesions regardless of whether the user captures a close-up or a wider shot of the leaf.

#### 4. Random Brightness
Adjusts the brightness of the image by a random factor within ±15%. For each pixel value I_in(c) on color channel c in {R, G, B}, the brightness shift is modeled as:

I_out(c) = clip(I_in(c) + delta * 255, 0, 255)

where delta in the range [-0.15, +0.15] is the random brightness offset factor, and the clip operation ensures the final pixel value remains within the valid [0, 255] range.

Real-world photos are captured under direct sunlight, overcast skies, or in the shade of the plant canopy. This parameter prevents the model from relying on absolute color values, helping it generalize across different lighting conditions.

#### 5. Random Contrast
Alters the contrast of the image by up to 15%. The contrast adjustment scales the difference between individual pixel values and the mean luminance mean_c of the channel:

I_out(c) = clip(alpha * (I_in(c) - mean_c) + mean_c, 0, 255)

where alpha in the range [0.85, 1.15] is the contrast multiplier factor, and mean_c is the mean pixel value of channel c.

This simulates variations in camera exposure and sensor qualities across different smartphone brands, making the model robust to differences in device hardware.

#### 6. Random Translation
Randomly shifts the image vertically by a factor t_y and horizontally by t_x, where t_x, t_y are in the range [-0.1, +0.1]:

x' = x + t_x * W

y' = y + t_y * H

Translation forces the model to learn features that are spatially independent, ensuring it can classify a leaf even if it is not perfectly centered in the frame.

---

## 2.7 Dataset Splitting and Validation Strategy

To ensure a fair, unbiased, and mathematically rigorous evaluation of the model, the augmented dataset was partitioned into three distinct subsets: the **Training Set**, the **Validation Set**, and the **Testing Set**.

The division of data was conducted according to the following strategy:
*   **Training Set (80%)**: Used by the backpropagation algorithm to update the model's weights. The network learns the core features of the 38 classes from this partition.
*   **Validation Set (20%)**: Used during training to monitor the model's generalization performance and evaluate loss at the end of each epoch. This set is critical for hyperparameter tuning, preventing overfitting, and triggering callbacks (such as early stopping and learning rate reduction).
*   **Testing Set (Flat Partition)**: A set of 25 unlabeled images, including out-of-distribution (OOD) samples. This partition was held out entirely from the training loop and used for final inference tests to verify the model's confidence thresholds and classification performance.

The training and validation sets were loaded with a fixed random seed of `42` to ensure reproducibility. In machine learning pipelines, random splitting without a static seed can lead to "data leakage," where some validation samples spill into the training set in subsequent training runs. Setting a static seed guarantees that the random partitioning remains identical across different training runs, enabling accurate comparison of model architectures, learning rates, and optimizers. Furthermore, a single 80/20 hold-out split was chosen over k-fold cross-validation because of the large size of our dataset (87,867 images). While k-fold cross-validation is excellent for small datasets (under 10,000 images), running it on our large dataset would require training the model k times, which would exceed our Kaggle GPU time quota (limited to 30 hours per week) without providing significant statistical benefits. The 20% validation set (~17,500 images) provides a large enough sample size to estimate the true generalization error with extremely high confidence.

[INSERT IMAGE HERE: Figure 2.4 - Pie Chart Illustrating the Dataset Splitting Strategy and the Flow of Data through the Training Pipeline]
