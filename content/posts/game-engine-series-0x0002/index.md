---
title: Game Engine Series [0x0002] - Introduction To Vulkan API
description: Introduction To Vulkan
date: 2021-09-11T14:12:31.326Z
draft: false
tags:
  - GameEngine
  - ComputerGraphics
  - Infinity
  - C++
categories:
  - GameEngine
  - ComputerGraphics
  - Infinity
---
This post will be on introduction to Vulkan API. We will try to get an idea of how Vulkan Loader works, look at some common definitions and some other interesting things! So, let's begin by asking what is Vulkan?

### What is Vulkan ?

Vulkan is a fast, new and modern 3D graphics programming API. The initial release was about 5 years ago and it is now used my many games and game engines. Vulkan is largely based on the Mantle API, which was initially made by AMD. It is written purely in C and supports many platforms like : Android, Linux, Fuschia, BSD Unix, QNX, Windows, Nintendo Switch, Staida, Tizen, macOS, iOS, Raspberry Pi. It is licensed on [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) which means we can use it too.

### But why is it called an API?

Well, this is because it is an API. Vulkan API is a set of rules (more like an agreement between developer and hardware vendor for functions with defined valid usage and invalid usage etc...) defined in the [vkspec](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/html/vkspec.html) which hardware vendors follow, more like make an implementation out of it to make their device driver. This driver contains functions with same names and arguments as defined in [vkspec](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/html/vkspec.html) and these functions, no matter how they are implemented in the inside must look and work in the same way as defined by the [vkspec](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/html/vkspec.html). The whole purpose of this API is to hide the actual implemetation from the user. This way no matter how the hardware vendors implement their device driver, we can use it as long as it follows the API rules. The functions defined in the device driver can be used to interact with GPU or any other device that can do some processing using the device driver provided by the hardware vendor. In simple words, Vulkan API is the header (.hpp) of a class and the `ICD` is the definition(.cpp) of that class and you are using this class in your application. So, you see Vulkan is combination of both the specification and the implementation (`ICD`) which makes the Vulkan API. First the API is decided, then a specification (vkspec) and implementation (drivers) is made for that version of API.

### Can't we just directly talk to GPU?

Short answer : **Not always**

Long answer : You cannot (you can in some cases like Intel and AMD), because that'd mean the GPU vendor revelaing their secrets to you. Each graphic card manufacturer try to make their product faster than their competetors and in that pursuit they research a lot and make their own methods to do stuffs faster and those methods are to be kept confidential. That is why we have a graphics driver. It is a platform and graphics card dependent library which contains the functions that [Vulkan Spec](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/html/vkspec.html) defines and we link to that library to interact with the GPU.

To get an idea of how Intel driver works see the [Anvil source code](https://gitlab.freedesktop.org/mesa/mesa/-/tree/main/src/intel/vulkan) and [RADV source code](https://gitlab.freedesktop.org/mesa/mesa/-/tree/main/src/amd/vulkan) for AMD.

### But, how exactly do we talk to GPU?

As stated above, we link our program with the graphics driver in order to make it talk to GPU. But wouldn't that mean that we have to have graphics driver for every vendor our there? No, you don't need to do that! This is where the interface comes in. Since, Vulkan is an interface between our program and GPU, as long as both the hardware vendor and the developer follow the rules defined by Vulkan API to use it's interface, then they don't need to care about each other. You can just assume that the system that your program will run in will already have the graphics drivers in place and then we can just link to it dynamically at runtime because ofcourse static linking will not be possible here. After we load the `ICD` at runtime, we do a sybmol lookup and fill up our function symbols with pointers to the actual functions in memory.

### How exactly will I link to driver dynamically?

You use the [Vulkan Loader](https://github.com/KhronosGroup/Vulkan-Loader) developed by the Khronos Group. As mentioned earlier, the Loader will search for available `ICD`s present on host machine and will try to load them by using library functions like [`dlopen`](https://man7.org/linux/man-pages/man3/dlopen.3.html) on Linux or [`LoadLibraryA`](https://docs.microsoft.com/en-us/windows/win32/api/libloaderapi/nf-libloaderapi-loadlibrarya) on Windows. You can link to this loader either dynamically at runtime(like what volk does) or the usual way that we will follow because by default libraries are linked dynamically or we statically link the loader with our program. For help with the former method, refer to the following resources (if you want to make your own loader instead of using [volk](https://github.com/zeux/volk) or [Vulkan Loader](https://github.com/KhronosGroup/Vulkan-Loader)) : 

* For Linux or other Unix based systems : <https://tldp.org/HOWTO/Program-Library-HOWTO/dl-libraries.html>
* For Windows : <https://docs.microsoft.com/en-us/windows/win32/dlls/using-run-time-dynamic-linking>
* Intel tutorial on how to do it for vulkan : <https://software.intel.com/content/www/us/en/develop/articles/api-without-secrets-introduction-to-vulkan-part-1.html>

For the latter method, we just have to download [Vulkan Loader](https://github.com/KhronosGroup/Vulkan-Loader) and link to it statically or dynamically however you like. This is the method I will choose. There is a small performance gain if you use a custom loader instead, I, however at this moment just want to see something on my screen ASAP.

Volk (and similar implementations) gets it's perfomance boost because it skips the [trampoline](http://kylehalladay.com/blog/2020/11/13/Hooking-By-Example.html) (also known as hooking) part in Vulkan Loader. An example image retrieved from khronos site is :

{{< img src="/images/external/vulkan-loader-deep-dive-khronos.jpg" alt="Webinar Recap: Vulkan Loader Deep Dive" caption="Source: Khronos Group." title="Source: Khronos Group." >}}
Here is a paragraph from a [vulkan.lunarg.com post](https://vulkan.lunarg.com/doc/view/1.2.170.0/windows/loader_and_layer_interface.html) : 

> ##### [](https://vulkan.lunarg.com/doc/view/1.2.170.0/windows/loader_and_layer_interface.html#user-content-indirectly-linking-to-the-loader)Indirectly Linking to the Loader
>
> Applications are not required to link directly to the loader library, instead they can use the appropriate platform-specific dynamic symbol lookup on the loader library to initialize the application's own dispatch table. This allows an application to fail gracefully if the loader cannot be found. It also provides the fastest mechanism for the application to call Vulkan functions. An application will only need to query (via system calls such as `dlsym`) the address of `vkGetInstanceProcAddr` from the loader library. Using `vkGetInstanceProcAddr` the application can then discover the address of all functions and extensions available, such as `vkCreateInstance`, `vkEnumerateInstanceExtensionProperties` and `vkEnumerateInstanceLayerProperties` in a platform-independent way.
>
> ##### Best Application Performance Setup
>
> If you desire the best performance possible, you should set up your own dispatch table so that all your Instance functions are queried using `vkGetInstanceProcAddr` and all your Device functions are queried using `vkGetDeviceProcAddr`.

So notice that when no layers are enabled, you'll be directly talking to the `ICD`.

### How does the loader work?

The main task of loader is to search for the graphics driver, also called `Installable Client Driver` (`ICD`) and then get pointers to all or some functions from the library file after loading it into memory. List of installed `ICD`s can be found in a `json` file that is stored in a specific place during Vulkan SDK installation. In Linux you can usually find this `json` file in `/usr/share/vulkan/icd.d`.

Say you are calling some function named `doSomething(xyz)`. Now, this function has to be defined somewhere otherwise your program will show a `segfault` or some other linking error. When a loader links with your program, it contains the symbols of all or some Vulkan functions. When your program will execute, the loader will search for a valid `ICD` on your system (eg : `/usr/lib/libvulkan_intel.so.` in linux for intel integrated graphics) . Once, a valid `ICD` is found, the loader loads it using the system libraries like `dl` on linux. It loads the file in the memory and then gets the memory address of functions using their names. Once we have the address, these addresses are stored in those symbols defined by the loader earlier. This way when you call the function `doSomething(xyz)`, your request is first recieved by the loader and then redirected to the `ICD`, or more precisely the graphics driver that the hardware vendor developed for you to talk to their hardware.

This way the loader allows you to use multiple `ICD`s at a time! You just need to have the driver and the `ICD` present on your system. Below is an image to show how loader works

{{< img src="/images/external/vulkan-loader-high-level.png" alt="High Level View of Loader" caption="Source: KhronosGroup/Vulkan-Loader repository." title="Source: KhronosGroup/Vulkan-Loader repository." >}}

In Linux you will generally find the loader as a shared object file named `/usr/lib/libvulkan.so`. You will see a library file named the same in our projects `/lib` directory because remember we build this as a dependency.

### Vulkan Validation Layers

Validation layers are helper libraries that intercept your application's communication with the GPU (Vulkan Physical Device or [`VkPhysicalDevice`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkPhysicalDevice.html)). They help you in detecting bugs and errors in your program for easy debugging. They are an optional feature and hence can be removed anytime. This plugin type behaviour helps when you are deploying your game. In the debug builds, you can enable them to look for errors and in the release builds you can turn them off. This way, there won't be any error checking in release builds of your game and it will run faster as compared to the debug builds. In APIs like OpenGL, error checking is done all the time which adds an extra performance drop in the application. Layers sometimes also modify your function calls just in order to make them work.In the above image, you can see the connection between loader and the layer is a two way communication channel.

When you ask Vulkan to get all layers present on system, it will look for a manifest file which provides the names and versions of layers that are present on the system. The location of this manifest file is provided in the environment variables of your system. It is generally located in `/usr/share/vulkan/explicit_layers.d`.

### Vulkan Extensions

Vulkan extensions augment the Vulkan API by providing more platform specific or device specific feature. For example : Vulkan does not provide a direct way to display rendered images onto the screen. For this there is a Vulkan extension for creating a display surface for the window created by application. This extension is named `VK_KHR_surface`. This extension can be used to display rendered images onto the window we create. This extension is used in combination with a platform specific extension for surface creation. There is an extension named `VK_KHR_swapchain` to create a swapchain for us. A swapchain is used to replace image currenly presented on screen with a newly rendered one.

You can see the list of all vulkan instance and extensions on your system by executing `vulkaninfo --summary`

### Vulkan Instance ([`VkInstance`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkInstance.html))

A Vulkan instance represents our communication state with Vulkan. In OpenGL, the system is initialized for all application and all applications communicate with same instance of OpenGL but here in Vulkan, all applications talk to Vulkan in a different manner so they each need to have their own Vulkan Instance. This instance stores our application information and defines how we are going to use Vulkan. Below is a statement from vkspec

> There is no global state in Vulkan and all per-application state is stored in a [`VkInstance`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkInstance.html) object. Creating a [`VkInstance`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkInstance.html) object initializes the Vulkan library and allows the application to pass information about itself to the implementation.

When we will create a [`VkInstance`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkInstance.html), we will request instance level extensions and layers to be enabled. The loader will forward our calls or enabled layers and extensions when needed.

This [`VkInstance`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkInstance.html) is actually a pointer to a data structure defined somewhere in the driver code. Here is an example how Anvil implements a Vulkan instance : 

```cpp
#include "vk_instance.h"

struct anv_instance {
    struct vk_instance                          vk;

    bool                                        physical_devices_enumerated;
    struct list_head                            physical_devices;

    bool                                        pipeline_cache_enabled;

    struct driOptionCache                       dri_options;
    struct driOptionCache                       available_dri_options;
};
```

What you will be able to use in your code is only a pointer to this data structure and some functions to manipulate this struct. You are only restricted to using the API and not this code.

Here is how RADV for AMD implements it : 

```cpp
#include "vk_instance.h"

struct radv_instance {
   struct vk_instance vk;

   VkAllocationCallbacks alloc;

   uint64_t debug_flags;
   uint64_t perftest_flags;

   bool physical_devices_enumerated;
   struct list_head physical_devices;

   struct driOptionCache dri_options;
   struct driOptionCache available_dri_options;

   /**
    * Workarounds for game bugs.
    */
   bool enable_mrt_output_nan_fixup;
   bool disable_tc_compat_htile_in_general;
   bool disable_shrink_image_store;
   bool absolute_depth_bias;
   bool report_apu_as_dgpu;
};
```

Notice the change in definition of instance when the device changes. Definiton of `vk_instance` can be found in `mesa/src/vulkan/util` to be  : 

```cpp
// in vk_objects.h
struct vk_object_base {
   VK_LOADER_DATA _loader_data;
   VkObjectType type;

   struct vk_device *device;

   /* For VK_EXT_private_data */
   struct util_sparse_array private_data;
};

// in vk_instance.h
struct vk_instance {
   struct vk_object_base base;
   VkAllocationCallbacks alloc;

   struct vk_app_info app_info;
   struct vk_instance_extension_table enabled_extensions;

   struct vk_instance_dispatch_table dispatch_table;

   /* VK_EXT_debug_report debug callbacks */
   struct {
      mtx_t callbacks_mutex;
      struct list_head callbacks;
   } debug_report;
};
```

There is a `struct` named [loader_instance](https://github.com/KhronosGroup/Vulkan-Loader/blob/e1dc222803390e8e18e4a9a211609341ea34ccab/loader/loader_common.h#L230) in the [Vulkan Loader](https://github.com/KhronosGroup/Vulkan-Loader) too but that is only a wrapper around these actual implementations.

```cpp
// Per instance structure
struct loader_instance {
    struct loader_instance_dispatch_table *disp;  // must be first entry in structure

    // Vulkan API version the app is intending to use.
    uint16_t app_api_major_version;
    uint16_t app_api_minor_version;

    // We need to manually track physical devices over time.  If the user
    // re-queries the information, we don't want to delete old data or
    // create new data unless necessary.
    uint32_t total_gpu_count;
    uint32_t phys_dev_count_term;
    struct loader_physical_device_term **phys_devs_term;
    uint32_t phys_dev_count_tramp;
    struct loader_physical_device_tramp **phys_devs_tramp;

    // We also need to manually track physical device groups, but we don't need
    // loader specific structures since we have that content in the physical
    // device stored internal to the public structures.
    uint32_t phys_dev_group_count_term;
    struct VkPhysicalDeviceGroupProperties **phys_dev_groups_term;
    uint32_t phys_dev_group_count_tramp;
    struct VkPhysicalDeviceGroupProperties **phys_dev_groups_tramp;

    struct loader_instance *next;

    uint32_t total_icd_count;
    struct loader_icd_term *icd_terms;
    struct loader_icd_tramp_list icd_tramp_list;

    struct loader_dispatch_hash_entry dev_ext_disp_hash[MAX_NUM_UNKNOWN_EXTS];
    struct loader_dispatch_hash_entry phys_dev_ext_disp_hash[MAX_NUM_UNKNOWN_EXTS];

    struct loader_msg_callback_map_entry *icd_msg_callback_map;

    struct loader_layer_list instance_layer_list;
    bool override_layer_present;

    // List of activated layers.
    //  app_      is the version based on exactly what the application asked for.
    //            This is what must be returned to the application on Enumerate calls.
    //  expanded_ is the version based on expanding meta-layers into their
    //            individual component layers.  This is what is used internally.
    struct loader_layer_list app_activated_layer_list;
    struct loader_layer_list expanded_activated_layer_list;

    VkInstance instance;  // layers/ICD instance returned to trampoline

    struct loader_extension_list ext_list;  // icds and loaders extensions
    union loader_instance_extension_enables enabled_known_extensions;

    VkLayerDbgFunctionNode *DbgFunctionHead;
    uint32_t num_tmp_report_callbacks;
    VkDebugReportCallbackCreateInfoEXT *tmp_report_create_infos;
    VkDebugReportCallbackEXT *tmp_report_callbacks;
    uint32_t num_tmp_messengers;
    VkDebugUtilsMessengerCreateInfoEXT *tmp_messenger_create_infos;
    VkDebugUtilsMessengerEXT *tmp_messengers;

    VkAllocationCallbacks alloc_callbacks;

    bool wsi_surface_enabled;
#ifdef VK_USE_PLATFORM_WIN32_KHR
    bool wsi_win32_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_WAYLAND_KHR
    bool wsi_wayland_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_XCB_KHR
    bool wsi_xcb_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_XLIB_KHR
    bool wsi_xlib_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_DIRECTFB_EXT
    bool wsi_directfb_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_ANDROID_KHR
    bool wsi_android_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_MACOS_MVK
    bool wsi_macos_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_IOS_MVK
    bool wsi_ios_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_GGP
    bool wsi_ggp_surface_enabled;
#endif
    bool wsi_headless_surface_enabled;
#if defined(VK_USE_PLATFORM_METAL_EXT)
    bool wsi_metal_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_FUCHSIA
    bool wsi_imagepipe_surface_enabled;
#endif
#ifdef VK_USE_PLATFORM_SCREEN_QNX
    bool wsi_screen_surface_enabled;
#endif
    bool wsi_display_enabled;
    bool wsi_display_props2_enabled;
};
```

`VkInstance` is actually a typedef to `VkInstance_T*` as you will see here : 

```
// link : https://github.com/KhronosGroup/Vulkan-Headers/blob/4fee3efc189c83ccd26a9cd8265185c98458c94d/include/vulkan/vulkan_core.h#L25
#define VK_DEFINE_HANDLE(object) typedef struct object##_T* object;

// link : https://github.com/KhronosGroup/Vulkan-Headers/blob/4fee3efc189c83ccd26a9cd8265185c98458c94d/include/vulkan/vulkan_core.h#L100
VK_DEFINE_HANDLE(VkInstance)
```

### Vulkan Physical Device (`VkPhysicalDevice`)

A Physical Device represents any Vulkan compatible device connected to your system. By Vulkan compatible, I mean that there is an `ICD` present for it on your system. Since your GPU has a device driver that conforms to the Vulkan API, it's Vulkan compatible. If the loader detects an `ICD` present on your system, it'll create a struct that wraps the actual physical device struct in the `ICD` and return it's pointer to us. We can then use this to talk to our GPU in future. Below is an example from RADV to show how it is implemented in the driver : 

```cpp
struct radv_physical_device {
   struct vk_physical_device vk;

   /* Link in radv_instance::physical_devices */
   struct list_head link;

   struct radv_instance *instance;

   struct radeon_winsys *ws;
   struct radeon_info rad_info;
   char name[VK_MAX_PHYSICAL_DEVICE_NAME_SIZE];
   uint8_t driver_uuid[VK_UUID_SIZE];
   uint8_t device_uuid[VK_UUID_SIZE];
   uint8_t cache_uuid[VK_UUID_SIZE];

   int local_fd;
   int master_fd;
   struct wsi_device wsi_device;

   bool out_of_order_rast_allowed;

   /* Whether DCC should be enabled for MSAA textures. */
   bool dcc_msaa_allowed;

   /* Whether to enable NGG. */
   bool use_ngg;

   /* Whether to enable NGG streamout. */
   bool use_ngg_streamout;

   /* Number of threads per wave. */
   uint8_t ps_wave_size;
   uint8_t cs_wave_size;
   uint8_t ge_wave_size;

   /* Whether to use the LLVM compiler backend */
   bool use_llvm;

   /* This is the drivers on-disk cache used as a fallback as opposed to
    * the pipeline cache defined by apps.
    */
   struct disk_cache *disk_cache;

   VkPhysicalDeviceMemoryProperties memory_properties;
   enum radeon_bo_domain memory_domains[VK_MAX_MEMORY_TYPES];
   enum radeon_bo_flag memory_flags[VK_MAX_MEMORY_TYPES];
   unsigned heaps;

#ifndef _WIN32
   int available_nodes;
   drmPciBusInfo bus_info;

   dev_t primary_devid;
   dev_t render_devid;
#endif

   nir_shader_compiler_options nir_options;
};
```

and again this will be different from what Anvil implements : 

```cpp
struct anv_physical_device {
    struct vk_physical_device                   vk;

    /* Link in anv_instance::physical_devices */
    struct list_head                            link;

    struct anv_instance *                       instance;
    char                                        path[20];
    struct {
       uint16_t                                 domain;
       uint8_t                                  bus;
       uint8_t                                  device;
       uint8_t                                  function;
    }                                           pci_info;
    struct intel_device_info                      info;
    /** Amount of "GPU memory" we want to advertise
     *
     * Clearly, this value is bogus since Intel is a UMA architecture.  On
     * gfx7 platforms, we are limited by GTT size unless we want to implement
     * fine-grained tracking and GTT splitting.  On Broadwell and above we are
     * practically unlimited.  However, we will never report more than 3/4 of
     * the total system ram to try and avoid running out of RAM.
     */
    bool                                        supports_48bit_addresses;
    struct brw_compiler *                       compiler;
    struct isl_device                           isl_dev;
    struct intel_perf_config *                    perf;
    /*
     * Number of commands required to implement a performance query begin +
     * end.
     */
    uint32_t                                    n_perf_query_commands;
    int                                         cmd_parser_version;
    bool                                        has_exec_async;
    bool                                        has_exec_capture;
    bool                                        has_exec_fence;
    bool                                        has_syncobj_wait;
    bool                                        has_syncobj_wait_available;
    bool                                        has_context_priority;
    bool                                        has_context_isolation;
    bool                                        has_thread_submit;
    bool                                        has_mmap_offset;
    bool                                        has_userptr_probe;
    uint64_t                                    gtt_size;

    bool                                        use_softpin;
    bool                                        always_use_bindless;
    bool                                        use_call_secondary;

    /** True if we can access buffers using A64 messages */
    bool                                        has_a64_buffer_access;
    /** True if we can use bindless access for images */
    bool                                        has_bindless_images;
    /** True if we can use bindless access for samplers */
    bool                                        has_bindless_samplers;
    /** True if we can use timeline semaphores through execbuf */
    bool                                        has_exec_timeline;

    /** True if we can read the GPU timestamp register
     *
     * When running in a virtual context, the timestamp register is unreadable
     * on Gfx12+.
     */
    bool                                        has_reg_timestamp;

    /** True if this device has implicit AUX
     *
     * If true, CCS is handled as an implicit attachment to the BO rather than
     * as an explicitly bound surface.
     */
    bool                                        has_implicit_ccs;

    bool                                        always_flush_cache;

    uint32_t                                    subslice_total;

    struct {
      uint32_t                                  family_count;
      struct anv_queue_family                   families[ANV_MAX_QUEUE_FAMILIES];
    } queue;

    struct {
      uint32_t                                  type_count;
      struct anv_memory_type                    types[VK_MAX_MEMORY_TYPES];
      uint32_t                                  heap_count;
      struct anv_memory_heap                    heaps[VK_MAX_MEMORY_HEAPS];
      bool                                      need_clflush;
    } memory;

    struct anv_memregion                        vram;
    struct anv_memregion                        sys;
    uint8_t                                     driver_build_sha1[20];
    uint8_t                                     pipeline_cache_uuid[VK_UUID_SIZE];
    uint8_t                                     driver_uuid[VK_UUID_SIZE];
    uint8_t                                     device_uuid[VK_UUID_SIZE];

    struct disk_cache *                         disk_cache;

    struct wsi_device                       wsi_device;
    int                                         local_fd;
    bool                                        has_local;
    int64_t                                     local_major;
    int64_t                                     local_minor;
    int                                         master_fd;
    bool                                        has_master;
    int64_t                                     master_major;
    int64_t                                     master_minor;
    struct drm_i915_query_engine_info *         engine_info;

    void (*cmd_emit_timestamp)(struct anv_batch *, struct anv_bo *, uint32_t );
    struct intel_measure_device                 measure_device;
};
```

where `vk_physical_device` is : 

```cpp
struct vk_physical_device {
   struct vk_object_base base;
   struct vk_instance *instance;

   struct vk_device_extension_table supported_extensions;

   struct vk_physical_device_dispatch_table dispatch_table;
};
```

### Vulkan Logical Device ([`VkDevice`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkDevice.html))

A logical device is exactly what it's name represents. It is not a real device like [`VkPhysicalDevice`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkPhysicalDevice.html). We define what features we want to use from the physical device and create a logical device from it. This logical device will contain the state of our interaction with the GPU we are using. This also means that we can have multiple logical devices for the same physical device, each one using either same or different features of the physical device. This way you can actually select the best physical device out of all the available ones and use it for heavy tasks and use a less performant one for smaller tasks. 

Here is Anvil's implementation of `VkDevice` :

```cpp
// defined in anv_private.h
struct anv_device {
    struct vk_device                            vk;

    struct anv_physical_device *                physical;
    struct intel_device_info                      info;
    struct isl_device                           isl_dev;
    int                                         context_id;
    int                                         fd;
    bool                                        can_chain_batches;
    bool                                        robust_buffer_access;
    bool                                        has_thread_submit;

    pthread_mutex_t                             vma_mutex;
    struct util_vma_heap                        vma_lo;
    struct util_vma_heap                        vma_cva;
    struct util_vma_heap                        vma_hi;

    /** List of all anv_device_memory objects */
    struct list_head                            memory_objects;

    struct anv_bo_pool                          batch_bo_pool;

    struct anv_bo_cache                         bo_cache;

    struct anv_state_pool                       general_state_pool;
    struct anv_state_pool                       dynamic_state_pool;
    struct anv_state_pool                       instruction_state_pool;
    struct anv_state_pool                       binding_table_pool;
    struct anv_state_pool                       surface_state_pool;

    struct anv_state_reserved_pool              custom_border_colors;

    /** BO used for various workarounds
     *
     * There are a number of workarounds on our hardware which require writing
     * data somewhere and it doesn't really matter where.  For that, we use
     * this BO and just write to the first dword or so.
     *
     * We also need to be able to handle NULL buffers bound as pushed UBOs.
     * For that, we use the high bytes (>= 1024) of the workaround BO.
     */
    struct anv_bo *                             workaround_bo;
    struct anv_address                          workaround_address;

    struct anv_bo *                             trivial_batch_bo;
    struct anv_state                            null_surface_state;

    struct anv_pipeline_cache                   default_pipeline_cache;
    struct blorp_context                        blorp;

    struct anv_state                            border_colors;

    struct anv_state                            slice_hash;

    uint32_t                                    queue_count;
    struct anv_queue  *                         queues;

    struct anv_scratch_pool                     scratch_pool;
    struct anv_bo                              *rt_scratch_bos[16];

    struct anv_shader_bin                      *rt_trampoline;
    struct anv_shader_bin                      *rt_trivial_return;

    pthread_mutex_t                             mutex;
    pthread_cond_t                              queue_submit;
    int                                         _lost;
    int                                         lost_reported;

    struct intel_batch_decode_ctx               decoder_ctx;
    /*
     * When decoding a anv_cmd_buffer, we might need to search for BOs through
     * the cmd_buffer's list.
     */
    struct anv_cmd_buffer                      *cmd_buffer_being_decoded;

    int                                         perf_fd; /* -1 if no opened */
    uint64_t                                    perf_metric; /* 0 if unset */

    struct intel_aux_map_context                *aux_map_ctx;

    const struct intel_l3_config                *l3_config;

    struct intel_debug_block_frame              *debug_frame_desc;
};
```

### Dispatchable and Non-Dispatchable Objects

First understand what dispatch table means by reading [this](https://blog.alicegoldfuss.com/function-dispatch-tables/) blog. Then [take a look at what vulkan spec says](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/html/vkspec.html#fundamentals-objectmodel-overview). After this read the following : 

From an application's point of view, a `dispatchable` handle is just an opaque handle to an underlying struct in the device driver. A non `dispatchable` handle is a `uint64_t` on `x86-64` platforms (major difference on `x86` platforms) but from the loader's point of view, a `dispatchable` handle contains a pointer to a dispatch table full of function pointers. When you make a `dispatchable` handle, for e.g. the `VkInstance` the loader will first create a  `loader_instance` (wrapper for Vulkan instance at loader level) and then will forward this call to all `ICD`s present on the system, then create the implementation level instance (eg : `anv_instance`, `radv_instance`), store their pointer and then will use it to get all instance related functions from the `ICD`s. The loader will then search for next `ICD` on the system and then do the same with that `ICD` too. If you take a good look at the loader level Vulkan instance wrapper, you will find that it is forming a linked list of all instances from various `ICD`s. If you make a logical device, then the loader will spawn a logical device for you and will get the respective functions from the `ICD`s in same way it was done for the instance. 

A `non-dispatchable` handle is just an opaque handle and it is never used to retrieve function pointers.

> The devices, queues, and other entities in Vulkan are represented by Vulkan objects. At the API level, all objects are referred to by handles. There are two classes of handles, dispatchable and non-dispatchable. *Dispatchable* handle types are a pointer to an opaque type. This pointer **may** be used by layers as part of intercepting API commands, and thus each API command takes a dispatchable type as its first parameter. Each object of a dispatchable type **must** have a unique handle value during its lifetime.

above para is from [vkspec](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/html/vkspec.html#fundamentals-objectmodel-overview).

Below is a part of code from `vulkan_core.h` header file.

```cpp
#define VK_DEFINE_HANDLE(object) typedef struct object##_T* object;


#ifndef VK_USE_64_BIT_PTR_DEFINES
    #if defined(__LP64__) || defined(_WIN64) || (defined(__x86_64__) && !defined(__ILP32__) ) || defined(_M_X64) || defined(__ia64) || defined (_M_IA64) || defined(__aarch64__) || defined(__powerpc64__)
        #define VK_USE_64_BIT_PTR_DEFINES 1
    #else
        #define VK_USE_64_BIT_PTR_DEFINES 0
    #endif
#endif


#ifndef VK_DEFINE_NON_DISPATCHABLE_HANDLE
    #if (VK_USE_64_BIT_PTR_DEFINES==1)
        #if (defined(__cplusplus) && (__cplusplus >= 201103L)) || (defined(_MSVC_LANG) && (_MSVC_LANG >= 201103L))
            #define VK_NULL_HANDLE nullptr
        #else
            #define VK_NULL_HANDLE ((void*)0)
        #endif
    #else
        #define VK_NULL_HANDLE 0ULL
    #endif
#endif
#ifndef VK_NULL_HANDLE
    #define VK_NULL_HANDLE 0
#endif


#ifndef VK_DEFINE_NON_DISPATCHABLE_HANDLE
    #if (VK_USE_64_BIT_PTR_DEFINES==1)
        #define VK_DEFINE_NON_DISPATCHABLE_HANDLE(object) typedef struct object##_T *object;
    #else
        #define VK_DEFINE_NON_DISPATCHABLE_HANDLE(object) typedef uint64_t object;
    #endif
#endif

VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkBuffer)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkImage)
VK_DEFINE_HANDLE(VkInstance)
VK_DEFINE_HANDLE(VkPhysicalDevice)
VK_DEFINE_HANDLE(VkDevice)
VK_DEFINE_HANDLE(VkQueue)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkSemaphore)
VK_DEFINE_HANDLE(VkCommandBuffer)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkFence)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkDeviceMemory)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkEvent)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkQueryPool)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkBufferView)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkImageView)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkShaderModule)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkPipelineCache)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkPipelineLayout)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkPipeline)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkRenderPass)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkDescriptorSetLayout)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkSampler)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkDescriptorSet)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkDescriptorPool)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkFramebuffer)
VK_DEFINE_NON_DISPATCHABLE_HANDLE(VkCommandPool)
```

Clearly from above code, [`VkInstance`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkInstance.html), [`VkDevice`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkDevice.html), [`VkPhysicalDevice`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkPhysicalDevice.html), [`VkQueue`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkQueue.html) and [`VkCommandBuffer`](https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkCommandBuffer.html) are `dispatchable` handles. So these all will be used to get dispatch tables to get function pointers. You will also see structures named dispatch table in the instance, physical device, logical device structure provided above.

So, this is it for this post. There is much more to learn in the Vulkan API. This is all what will need in the next few posts. I will explain other left out things when needed. 

Note that I'm just providing you these code snippets in order to get an idea of what is being done on the inside. You mustn't think that this is how all hardware vendors do it. When I started learning Vulkan, I just had this itching sensation to know what exactly is this instance or physical device represented in code? You can easily skip these code snippets as we won't be using them anywhere but going through this once won't harm you. Instead this will help you when you read some low level implementation code like this. The main purpose of me providing you these internal definitions is because you might not understand every concept right now and in future you might need to refer to this and when you do that, you'll have a more better understanding. Infact you must consider reading some previous blogs if you don't understand a concept. If you understand the inner workings then the API will be quite easy to learn. Ofcourse you won't be needing these internal implementations but it just helps (you will see).

See you in next post ;-)

This post had many errors. I'm thankful to members of [Vulkan Discord](https://www.discord.gg/vulkan) for helping me by pointing out my mistakes 😃
