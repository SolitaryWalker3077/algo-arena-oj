package com.oj.friend.controller.file;

import com.oj.common.entity.Result;
import com.oj.file.entity.OSSResult;
import com.oj.friend.service.file.IFileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "OSS文件")
@RestController
@RequestMapping("/file")
public class FileController {

    @Autowired
    private IFileService fileService;

    @Operation(summary = "文件上传接口")
    @PostMapping("/upload")
    public Result<OSSResult> upload(@RequestBody MultipartFile file) {
        return Result.success(fileService.upload(file));
    }
}
